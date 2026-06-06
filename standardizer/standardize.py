"""LLM-backed medicine-name standardization — the *fuzzy* step of Qiáo.

Takes unstructured, free-text prescription input (typed notes, OCR'd labels, a
patient's messy list, in English / Chinese / pinyin / Latin) and returns a
clean, de-duplicated split of Western Medicine (WM) and Traditional Chinese
Medicine (TCM) names.

The returned object mirrors the HDI API's request shape exactly
(`western_medicines` / `eastern_medicines`), so `result.model_dump()` is a
ready-to-POST body for `/api/v1/check-conflicts` (see `../hdi-api/README.md`).
It is also the shape persisted to the user's profile at intake.

Architectural contract (CLAUDE.md, principle #2): an LLM is used here ONLY for
the fuzzy step — reading, classifying, and normalizing names. It NEVER decides
whether an interaction exists or how severe it is. That verdict is a
deterministic database lookup in the separate `hdi-api` service.

The model is reached through the KIT SCC "ki-toolbox" gateway, which speaks the
OpenAI API. The API key is read from the environment server-side only and must
never reach the browser.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import List, Optional

from openai import OpenAI
from pydantic import BaseModel, Field

# Load the repo-root .env (gitignored) so OPENAI_API_KEY is available without
# extra wiring. Anchored to this file, so it works regardless of cwd. No-op if
# python-dotenv isn't installed or the file is absent — a real env var still wins.
try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

# OpenAI-compatible gateway (KIT SCC toolbox) + model id.
BASE_URL = "https://ki-toolbox.scc.kit.edu/api/v1"
MODEL = "azure.gpt-4.1-mini"

SYSTEM_PROMPT = """\
You normalize medication lists for a clinical reconciliation system. You receive \
unstructured, free-text input — typed notes, OCR'd prescription labels, or a \
patient's own list — that may contain Western (conventional pharmaceutical) \
medicines and/or Traditional Chinese Medicine (TCM) herbs and formulas, in any \
language (English, Chinese, pinyin, Latin).

Your ONLY job is to read, classify, and normalize the names. You do NOT assess \
safety, interactions, dosing, or suitability. You do NOT invent medicines that \
are not present in the input.

For every distinct medicine you find:
1. Classify it as Western Medicine (WM) or Traditional Chinese Medicine (TCM).
   - WM = conventional pharmaceutical drugs (e.g. warfarin, aspirin, metformin).
   - TCM = Chinese herbs or herbal formulas (e.g. danshen, dong quai, ginkgo, gan cao).
2. Normalize the name:
   - WM: use the standard generic (INN) English name, never the brand name
     (e.g. "Coumadin" -> "warfarin", "Panadol" -> "paracetamol").
   - TCM: use the common romanized (pinyin) English name used in interaction
     databases (e.g. 丹参 -> "danshen", 当归 -> "dong quai", 银杏 -> "ginkgo").
   - Strip dosages, strengths, frequencies, routes, and instructions.
   - Return every name in lowercase.
   - Deduplicate; never repeat the same medicine.

Return ONLY a JSON object, with no surrounding prose, with exactly these keys:
{"western_medicines": ["..."], "eastern_medicines": ["..."]}
Use empty arrays for a category with no medicines. If the input contains no \
recognizable medicines, return {"western_medicines": [], "eastern_medicines": []}.
"""


class StandardizedMedicines(BaseModel):
    """Cleaned, split medication lists — the output of the fuzzy intake step.

    Field names and shape intentionally match the HDI API's `InteractionRequest`
    so `model_dump()` is a drop-in `/api/v1/check-conflicts` request body.
    """

    western_medicines: List[str] = Field(
        default_factory=list,
        description="Normalized Western Medicine (WM) generic names, lowercase.",
    )
    eastern_medicines: List[str] = Field(
        default_factory=list,
        description="Normalized TCM herb/formula (pinyin) names, lowercase.",
    )


def standardize_medicines(
    user_input: str,
    *,
    client: Optional[OpenAI] = None,
    model: str = MODEL,
) -> StandardizedMedicines:
    """Standardize free-text prescription input into split WM / TCM lists.

    Args:
        user_input: Raw, unstructured medicine text from the patient or an OCR
            pass. May mix Western drugs and TCM herbs, in any language.
        client: Optional pre-built OpenAI client (handy for tests / reuse). When
            omitted, one is created from `OPENAI_API_KEY` against the KIT gateway.
        model: Override the chat model id.

    Returns:
        A `StandardizedMedicines` whose `model_dump()` can be POSTed straight to
        the HDI `/api/v1/check-conflicts` endpoint.

    Raises:
        ValueError: if `OPENAI_API_KEY` is unset and no client was supplied.
    """
    if not user_input or not user_input.strip():
        return StandardizedMedicines()

    if client is None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY is not set. Provide it in the server environment "
                "or pass an OpenAI `client` explicitly."
            )
        client = OpenAI(api_key=api_key, base_url=BASE_URL)

    response = client.chat.completions.create(
        model=model,
        temperature=0,  # Deterministic normalization for the fuzzy step.
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_input},
        ],
    )

    raw = response.choices[0].message.content or "{}"
    data = _parse_json_object(raw)

    return StandardizedMedicines(
        western_medicines=_clean_names(data.get("western_medicines")),
        eastern_medicines=_clean_names(data.get("eastern_medicines")),
    )


def _parse_json_object(raw: str) -> dict:
    """Parse the model's reply into a dict, tolerating stray code fences.

    JSON mode should return a bare object, but we strip ```json fences and fall
    back to `{}` so a malformed reply degrades to "no medicines found" rather
    than crashing the intake flow.
    """
    text = raw.strip()
    if text.startswith("```"):
        # Drop the opening fence (``` or ```json) and the closing fence.
        text = text.split("\n", 1)[-1] if "\n" in text else ""
        if text.rstrip().endswith("```"):
            text = text.rstrip()[: -len("```")]
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _clean_names(values: object) -> List[str]:
    """Coerce a model-supplied value into a unique, lowercase, ordered name list.

    Defends against the model returning non-lists, non-strings, blanks, or
    duplicates that differ only by case or surrounding whitespace.
    """
    if not isinstance(values, list):
        return []
    seen: set[str] = set()
    cleaned: List[str] = []
    for value in values:
        if not isinstance(value, str):
            continue
        name = value.strip().lower()
        if name and name not in seen:
            seen.add(name)
            cleaned.append(name)
    return cleaned


if __name__ == "__main__":
    # Quick manual check:
    #   echo "Coumadin 5mg daily, 丹参 tea, panadol prn, dong quai soup" \
    #     | python standardize.py
    import sys

    text = sys.stdin.read() if not sys.stdin.isatty() else " ".join(sys.argv[1:])
    result = standardize_medicines(text)
    print(json.dumps(result.model_dump(), ensure_ascii=False, indent=2))
