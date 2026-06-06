"""LLM-backed medicine-name EXTRACTION — the *fuzzy* step of Qiáo.

WHAT THIS DOES (AND WHAT IT DELIBERATELY DOES NOT)
--------------------------------------------------
Reads unstructured, free-text / OCR'd medicine input and returns a list of
clean candidate medicine-name strings — nothing more. It does **not** carry a
vocabulary, it does **not** decide which database entity each name is, and it
does **not** split Western vs. TCM. All of that is the deterministic resolver's
job (`hdi-api/resolver.py`, exposed as `POST /api/v1/resolve`).

This is a deliberate re-architecture. The old version embedded the *entire*
medicine vocabulary in the system prompt and forced the model to map onto it.
That does not scale to ~500–600 herbs, and it put the matching decision inside
the LLM. Now the LLM only *extracts* surface names; a database/index lookup does
the *matching*. The vocabulary never lives in the prompt.

    EXTRACT (here, LLM)  ->  RESOLVE (engine, deterministic)  ->  CHECK (engine)

Example:
  Input:  "I take Coumadin 5mg daily, 丹参茶, Advil for headaches, dong quai soup"
  Output: ExtractedMedicines(candidates=["Coumadin", "丹参", "Advil", "dong quai"])
          (dosages / preparation words stripped; names kept in original script)

FUZZY VS. DETERMINISTIC SPLIT (CLAUDE.md, principle #2)
-------------------------------------------------------
- **Fuzzy (here):** the LLM reads messy text into candidate name strings.
- **Deterministic (engine):** name → entity_id resolution and the safety verdict
  are pure lookups. The LLM never decides identity, interaction, or severity.

ARCHITECTURE
------------
- Provider: Google Gemini API (google-genai SDK), model gemini-2.5-flash.
- API key: GEMINI_API_KEY (falls back to GOOGLE_API_KEY). Server-side only.
- Determinism: temperature=0 + JSON response mode.
- Resilience: transient API errors (429 / 5xx) retried with exponential backoff.

USAGE
-----
  from standardizer.standardize import extract_medicines

  result = extract_medicines("Coumadin 5mg and danshen tea")
  print(result.model_dump())
  # {"candidates": ["Coumadin", "danshen"]}
  # -> POST these to the engine's /api/v1/resolve to get entity_ids.
"""

from __future__ import annotations

import json
import os
import random
import time
from pathlib import Path
from typing import List, Optional

from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import BaseModel, Field

# Load the repo-root .env (gitignored) so the Gemini API key is available without
# extra wiring. Anchored to this file, so it works regardless of cwd. No-op if
# python-dotenv isn't installed or the file is absent — a real env var still wins.
try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

# Google Gemini model id + the env vars checked (in order) for the key. Only
# Google key names are accepted here — never the KIT `OPENAI_API_KEY`.
MODEL = "gemini-2.5-flash"
_API_KEY_VARS = ("GEMINI_API_KEY", "GOOGLE_API_KEY")

# Transient API failures worth retrying: rate limiting (429) and server hiccups
# (5xx, e.g. the 503 "high demand" spike). Other errors fail fast.
_RETRYABLE_STATUS = frozenset({429, 500, 502, 503, 504})
_DEFAULT_MAX_ATTEMPTS = 3
_BASE_RETRY_DELAY = 1.0  # seconds; doubles each attempt, plus jitter

# ============================================================================
# SYSTEM PROMPT
# ============================================================================
#
# No vocabulary. The model's only job is to surface candidate medicine names; a
# deterministic index in the engine does the matching. Plain string (not an
# f-string) so the literal JSON braces below are safe.
SYSTEM_PROMPT = """\
You are the extraction step of a clinical medication-reconciliation system. You \
receive unstructured, free-text input — typed notes, OCR'd prescription labels, \
or a patient's own list — that may contain Western pharmaceutical drugs and/or \
Traditional Chinese Medicine (TCM) herbs and formulas, in any language (English, \
Chinese, pinyin, Latin, brand names), mixed together.

Your ONLY job is to find every distinct medicine, drug, herb, or formula \
mentioned and output its NAME as a clean candidate string. You do NOT decide \
what each name maps to, you do NOT translate, and you do NOT assess safety, \
interactions, dosing, or suitability. A separate deterministic system matches \
your candidates to a database.

Rules:
1. Output one candidate per distinct medicine mentioned.
2. Keep the name in its ORIGINAL language and script. Do NOT translate, \
romanize, or convert between Chinese and pinyin. If the input says "丹参", output \
"丹参"; if it says "Coumadin", output "Coumadin".
3. Strip everything that is not the name itself: dosages, strengths (e.g. "5mg"), \
frequencies, routes, dates, and instructions ("daily", "as needed", "twice a day").
4. Strip generic preparation / dosage-form words that are not part of the name: \
"tea", "soup", "decoction", "tablet", "capsule", "pill", "powder", "extract", \
"茶", "湯", "丸", "片". Keep the core herb/drug/formula name. Example: "丹参茶" -> \
"丹参"; "dong quai soup" -> "dong quai".
5. Do NOT invent names. Only output names actually present in the input. If you \
are unsure whether a token is a medicine, include it verbatim — the deterministic \
resolver will reject it if it is not real.
6. Deduplicate: never output the same name twice.

Return ONLY a JSON object, with no surrounding prose, with exactly this shape:
{"candidates": ["...", "..."]}
Use an empty array if the input contains no medicines: {"candidates": []}.
"""


class ExtractedMedicines(BaseModel):
    """Cleaned candidate medicine-name strings extracted from free text.

    This is the output of the *fuzzy* step. Each candidate is a surface name in
    its original script — NOT a resolved database entity. Feed `candidates` to
    the engine's `POST /api/v1/resolve` to map them onto entity_ids before any
    conflict check.
    """

    candidates: List[str] = Field(
        default_factory=list,
        description="Distinct medicine-name strings, original script, dosages stripped.",
    )


def extract_medicines(
    user_input: str,
    *,
    client: Optional[genai.Client] = None,
    model: str = MODEL,
    max_attempts: int = _DEFAULT_MAX_ATTEMPTS,
) -> ExtractedMedicines:
    """Extract candidate medicine-name strings from unstructured text.

    The LLM recognizes medicine mentions and returns their names verbatim (in the
    original script), with dosages and preparation words stripped. It performs no
    matching, translation, or safety judgement — those happen downstream in the
    deterministic engine.

    Args:
        user_input: Raw, unstructured medicine text (typed, OCR'd, any language).
        client: Optional pre-built genai.Client (for testing / reuse). When
            omitted, one is created from GEMINI_API_KEY (or GOOGLE_API_KEY).
        model: Gemini model id. Defaults to gemini-2.5-flash.
        max_attempts: Total tries on transient API errors (429 / 5xx), with
            exponential backoff between them. Set to 1 to disable retries.

    Returns:
        ExtractedMedicines with a deduplicated `candidates` list (empty when the
        input is empty or no medicines are found).

    Raises:
        ValueError: If no Gemini API key is set and no client was provided.
        google.genai.errors.APIError: On a non-retryable error, or after the
            final attempt fails.
    """
    if not user_input or not user_input.strip():
        return ExtractedMedicines()

    if client is None:
        client = genai.Client(api_key=_resolve_api_key())

    response = _generate_with_retry(
        client,
        model=model,
        contents=user_input,
        config=types.GenerateContentConfig(
            temperature=0,  # Deterministic extraction for the fuzzy step.
            response_mime_type="application/json",  # JSON-only output.
            system_instruction=SYSTEM_PROMPT,
        ),
        max_attempts=max_attempts,
    )

    raw = response.text or "{}"
    data = _parse_json_object(raw)
    return ExtractedMedicines(candidates=_clean_candidates(data.get("candidates")))


def _resolve_api_key() -> str:
    for var in _API_KEY_VARS:
        value = os.environ.get(var)
        if value:
            return value
    raise ValueError(
        "No Gemini API key found. Set GEMINI_API_KEY (preferred) in the server "
        f"environment, or {_API_KEY_VARS[1]}, or pass a `client` explicitly."
    )


def _generate_with_retry(
    client: genai.Client,
    *,
    model: str,
    contents: str,
    config: "types.GenerateContentConfig",
    max_attempts: int,
    base_delay: float = _BASE_RETRY_DELAY,
):
    """Call `generate_content`, retrying transient (429 / 5xx) failures.

    Backoff is exponential (`base_delay * 2**attempt`) plus random jitter. Non-
    retryable errors and the final failure propagate to the caller.
    """
    for attempt in range(max_attempts):
        try:
            return client.models.generate_content(
                model=model, contents=contents, config=config
            )
        except genai_errors.APIError as exc:
            last_attempt = attempt == max_attempts - 1
            if getattr(exc, "code", None) not in _RETRYABLE_STATUS or last_attempt:
                raise
            time.sleep(base_delay * (2 ** attempt) + random.uniform(0, base_delay))


def _parse_json_object(raw: str) -> dict:
    """Parse the LLM's JSON response, tolerating code fences / stray whitespace.

    JSON mode should yield bare JSON, but in practice the model occasionally
    wraps it in ```json fences. Strips those, parses, and degrades to {} on any
    failure so a malformed reply means "no medicines found" rather than a crash.
    """
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1] if "\n" in text else ""
        if text.rstrip().endswith("```"):
            text = text.rstrip()[: -len("```")]
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _clean_candidates(values: object) -> List[str]:
    """Trim, drop empties, and de-duplicate the LLM's candidate list.

    Preserves original casing/script (the resolver normalizes for matching) and
    insertion order. De-dup is case-insensitive on the trimmed string so "Warfarin"
    and "warfarin" collapse, but the first-seen spelling is kept.
    """
    if not isinstance(values, list):
        return []
    seen: set[str] = set()
    cleaned: List[str] = []
    for value in values:
        if not isinstance(value, str):
            continue
        name = value.strip()
        key = name.lower()
        if name and key not in seen:
            seen.add(key)
            cleaned.append(name)
    return cleaned


if __name__ == "__main__":
    # Quick manual check:
    #   echo "Coumadin 5mg daily, 丹参茶, advil prn, dong quai soup" | python standardize.py
    import sys

    text = sys.stdin.read() if not sys.stdin.isatty() else " ".join(sys.argv[1:])
    result = extract_medicines(text)
    print(json.dumps(result.model_dump(), ensure_ascii=False, indent=2))
