"""LLM-backed medicine-name standardization — the *fuzzy* step of Qiáo.

OVERVIEW
--------
Converts unstructured, free-text medicine lists into canonical database names.
The LLM is **constrained to the controlled vocabulary** — it can only output
medicines that exist in DATABASE_MEDICINES (which mirrors the HDI database).
Anything the LLM returns that is not in the vocabulary is silently dropped.

INPUT → LLM → VALIDATION → OUTPUT

Example:
  Input:  "I take Coumadin 5mg, 丹參 tea, Advil for headaches"
  Output: {
    "western_medicines": ["Warfarin", "Ibuprofen"],
    "eastern_medicines": ["Danshen"]
  }

KEY GUARANTEE
-------------
Every returned medicine name is an exact match to a `preferred_name` in the
HDI database (or will be once the database is populated with real data). The
output is valid for direct POST to `/api/v1/check-conflicts`.

FUZZY VS. DETERMINISTIC SPLIT (CLAUDE.md, principle #2)
-------------------------------------------------------
- **Fuzzy (here):** LLM recognizes and maps medicine names, handling brand names,
  synonyms, Chinese characters, pinyin, Latin names, OCR errors, etc.
- **Deterministic (hdi-api):** Conflict verdict is a pure database lookup. The
  LLM NEVER decides if an interaction is dangerous or how severe it is.

ARCHITECTURE
------------
- Provider: Google Gemini API (google-genai SDK)
- Model: gemini-2.5-flash
- API key: GEMINI_API_KEY (falls back to GOOGLE_API_KEY)
  Read from environment server-side only. Never exposed to the browser.
- Determinism: temperature=0 + JSON response mode for reproducible outputs
- System prompt: Embeds the controlled vocabulary and enforces strict constraints
  on what the model can output.
- Resilience: transient API errors (429 / 5xx) are retried with exponential backoff.

CONTROLLED VOCABULARY
---------------------
DATABASE_MEDICINES is the single source of truth. It defines exactly which
medicines the LLM is allowed to output. When the HDI database grows, update
this dict and the LLM automatically learns it on next module load.

For sync details and how to regenerate the vocab, see the comment in the code
above DATABASE_MEDICINES.

USAGE
-----
  from standardizer.standardize import standardize_medicines

  result = standardize_medicines("Coumadin and danshen tea")
  print(result.model_dump())  # Ready to POST to HDI API
  # {"western_medicines": ["Warfarin"], "eastern_medicines": ["Danshen"]}
"""

from __future__ import annotations

import json
import os
import random
import time
from pathlib import Path
from typing import Dict, List, Optional

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
# CONTROLLED VOCABULARY — Single Source of Truth
# ============================================================================
#
# DATABASE_MEDICINES is the exhaustive list of medicines the standardizer
# knows about. These are exact `preferred_name`s from the HDI database.
#
# WHY IT MATTERS
# ==============
# 1. The LLM is constrained to output only these names (system prompt)
# 2. The validator snaps output to exact spelling using this dict
# 3. If a medicine isn't here, it can't reach the conflict engine
# 4. When the HDI dataset grows, update this dict and the LLM learns it automatically
#
# SYNC WITH HDI DATABASE
# ======================
# This must stay in sync with the entities table in hdi-api/database.py.
# If the HDI database changes, regenerate this dict:
#
# From the repo root:
#   cd hdi-api
#   python -c "
#   from database import SessionLocal, Entity
#   db = SessionLocal()
#   west = [e.preferred_name for e in db.query(Entity).filter(Entity.type=='WM-drug').order_by(Entity.entity_id)]
#   east = [e.preferred_name for e in db.query(Entity).filter(Entity.type.like('TCM-%')).order_by(Entity.entity_id)]
#   print('WESTERN:', west)
#   print('EASTERN:', east)
#   "
#
# Then update DATABASE_MEDICINES below, commit, and push. The LLM learns it
# on next module import — no code changes needed.
#
# CURRENT STATUS
# ==============
# This is mock/test data. The real data will come from the clinical dataset
# (described in CLAUDE.md). Until then, these 46 medicines serve as a
# working prototype for the intake and conflict-check flow.
DATABASE_MEDICINES: Dict[str, List[str]] = {
    "western_medicines": [
        "Warfarin",
        "Aspirin",
        "Clopidogrel",
        "Glipizide",
        "Saquinavir",
        "Hydrochlorothiazide",
        "Cyclosporine",
        "Tacrolimus",
        "Simvastatin",
        "Digoxin",
        "Ethinylestradiol / norethindrone (combined oral contraceptive)",
        "Amlodipine",
        "Omeprazole",
        "Ibuprofen",
        "Amiodarone",
        "Fluconazole",
        "Clarithromycin",
        "Gemfibrozil",
        "Lisinopril",
        "Spironolactone",
        "Prednisolone",
        "Sertraline",
        "Indinavir",
        "Metformin",
    ],
    "eastern_medicines": [
        "Danshen",
        "Dong quai",
        "Ginkgo",
        "American ginseng",
        "Asian ginseng",
        "Garlic",
        "Licorice",
        "St John's Wort",
        "Schisandra (Wuzhi)",
        "Coptis",
        "Green tea",
        "Ginger",
        "Turmeric",
        "Sargassum",
        "Kansui",
        "Genkwa",
        "Aconite",
        "Pinellia",
        "Fritillaria",
        "Trichosanthes",
        "Veratrum",
        "Wulingzhi",
    ],
}

# Lookup tables for validation: map lowercase names to canonical DB spelling
# Used by _constrain() to snap the LLM's output to exact DB names
_WESTERN_LOOKUP: Dict[str, str] = {n.lower(): n for n in DATABASE_MEDICINES["western_medicines"]}
_EASTERN_LOOKUP: Dict[str, str] = {n.lower(): n for n in DATABASE_MEDICINES["eastern_medicines"]}


def _format_vocabulary() -> str:
    """Format DATABASE_MEDICINES as a readable list for the system prompt."""
    west = "\n".join(f"  - {n}" for n in DATABASE_MEDICINES["western_medicines"])
    east = "\n".join(f"  - {n}" for n in DATABASE_MEDICINES["eastern_medicines"])
    return f"WESTERN MEDICINES (WM):\n{west}\n\nEASTERN / TCM MEDICINES (TCM):\n{east}"


# ============================================================================
# SYSTEM PROMPT FOR THE LLM
# ============================================================================
#
# This prompt is the core constraint that keeps the LLM honest:
# - Explains the task (recognize and map medicines)
# - Lists the controlled vocabulary (the ONLY medicines allowed)
# - Enforces strict rules (only output names from the list, never invent, etc.)
#
# TEMPLATING
# ==========
# This is a plain string (not an f-string) so the literal JSON braces {} below
# are safe (not interpreted as f-string placeholders).
#
# The __VOCABULARY__ placeholder is replaced at module load by _format_vocabulary(),
# which generates the list from DATABASE_MEDICINES. This means:
# - When DATABASE_MEDICINES changes, the prompt automatically includes new medicines
# - No need to manually update the prompt
# - The LLM learns new vocab on next import
#
_SYSTEM_PROMPT_TEMPLATE = """\
You normalize medication lists for a clinical reconciliation system. You receive \
unstructured, free-text input — typed notes, OCR'd prescription labels, or a \
patient's own list — that may contain Western pharmaceutical drugs and/or \
Traditional Chinese Medicine (TCM) herbs and formulas, in any language (English, \
Chinese, pinyin, Latin, brand names).

Your ONLY job is to recognize each medicine in the input and map it to the \
matching name in the controlled list below. You do NOT assess safety, \
interactions, dosing, or suitability.

CONTROLLED VOCABULARY — these are the ONLY names you may output. Each line is one \
allowed medicine, grouped by whether it is Western (WM) or Eastern/TCM:

__VOCABULARY__

Rules:
1. For each medicine mentioned in the input, find the SINGLE best-matching entry \
in the controlled vocabulary, resolving brand names, synonyms, pinyin, Latin \
binomials, and Chinese names. Examples: "Coumadin" -> "Warfarin"; "Advil" -> \
"Ibuprofen"; "Glucophage" -> "Metformin"; 丹参 / "red sage" -> "Danshen"; \
当归 / "tang kuei" -> "Dong quai"; "gan cao" / 甘草 -> "Licorice"; \
银杏 / "EGb 761" -> "Ginkgo".
2. Output the matched name EXACTLY as written in the list — same spelling, casing, \
and punctuation. Do not translate, abbreviate, or lowercase it.
3. Place each matched name in the correct key: western_medicines for WM entries, \
eastern_medicines for TCM entries.
4. If a medicine in the input does NOT clearly correspond to any entry in the \
list, OMIT it entirely. Never guess, never invent, and never output a name that \
is not in the list above.
5. Ignore dosages, strengths, frequencies, routes, and instructions.
6. Deduplicate; never repeat the same name.

Return ONLY a JSON object, with no surrounding prose, with exactly these keys:
{"western_medicines": ["..."], "eastern_medicines": ["..."]}
Use empty arrays when a category has no matches. If nothing in the input matches \
the vocabulary, return {"western_medicines": [], "eastern_medicines": []}.
"""

SYSTEM_PROMPT = _SYSTEM_PROMPT_TEMPLATE.replace("__VOCABULARY__", _format_vocabulary())


class StandardizedMedicines(BaseModel):
    """Cleaned, split medication lists — ready to send to the conflict engine.

    OUTPUT OF THE FUZZY STEP
    ========================
    Every medicine name is an exact match to a `preferred_name` in the HDI
    database. Case, spelling, and punctuation are identical.

    USAGE
    =====
    The field names and shape intentionally match the HDI API's InteractionRequest,
    so this object's `model_dump()` is a drop-in body for the conflict check:

      result = standardize_medicines("Coumadin and danshen")
      conflicts = requests.post(
        "http://127.0.0.1:8000/api/v1/check-conflicts",
        json=result.model_dump()
      ).json()

    GUARANTEES
    ==========
    - No medicines are invented (only from DATABASE_MEDICINES)
    - No hallucinations (validated against the controlled vocab)
    - No duplicates
    - Case-exact to the database
    """

    western_medicines: List[str] = Field(
        default_factory=list,
        description="Western Medicine (WM) drug names, exactly as in the HDI database. Case-sensitive.",
    )
    eastern_medicines: List[str] = Field(
        default_factory=list,
        description="TCM herb/formula names, exactly as in the HDI database. Case-sensitive.",
    )


def standardize_medicines(
    user_input: str,
    *,
    client: Optional[genai.Client] = None,
    model: str = MODEL,
    max_attempts: int = _DEFAULT_MAX_ATTEMPTS,
) -> StandardizedMedicines:
    """Standardize free-text prescription input into HDI-compatible medicine lists.

    The core function of the standardizer. Uses an LLM to map each recognized
    medicine to a name in the controlled vocabulary (DATABASE_MEDICINES), then
    validates the output to ensure all returned names are in the HDI database.

    INPUT HANDLING
    ==============
    Accepts any unstructured text:
    - Typed notes: "Patient on warfarin for AFib"
    - OCR output: messy, with errors
    - Brand names: "Coumadin" → "Warfarin"
    - Synonyms: "red sage" → "Danshen"
    - Chinese: "丹參" or pinyin "danshen" → "Danshen"
    - Multiple languages mixed together
    - Dosages, frequencies, routes (ignored)

    PROCESSING PIPELINE
    ===================
    1. Empty check: If input is empty/whitespace, return empty lists immediately
    2. LLM call: Send to Gemini with the controlled vocab as a system instruction
    3. Parsing: Extract JSON from response (tolerant of code fences, malformed)
    4. Validation: Snap each name case-insensitively to DB exact spelling
    5. Drop: Anything not in the vocabulary is silently removed
    6. Dedup: Keep only unique names (preserve order)

    SAFETY PROPERTIES
    =================
    - No hallucinations: Only outputs names from DATABASE_MEDICINES
    - No typos: Validated to exact DB spelling via case-insensitive lookup
    - No invented medicines: Unknown medicines are dropped, never approximated
    - Deterministic: Same input → same output (temperature=0)

    Args:
        user_input: Raw, unstructured medicine text. May be:
            - Typed by patient/caretaker
            - OCR output from a prescription photo
            - Handwritten notes
            - Any combination of English, Chinese, pinyin, brand names, etc.
        client: Optional. Pre-built genai.Client for testing or reuse.
            If omitted, creates one from GEMINI_API_KEY (or GOOGLE_API_KEY).
            Useful for mocking in tests or reusing a client across calls.
        model: Optional. Gemini model id. Defaults to gemini-2.5-flash.
            Can be overridden for testing with a different model.
        max_attempts: Optional. Total tries on transient API errors (429 / 5xx),
            with exponential backoff between them. Set to 1 to disable retries.

    Returns:
        StandardizedMedicines with:
        - western_medicines: List of WM drug names (exact DB spelling)
        - eastern_medicines: List of TCM herb/formula names (exact DB spelling)
        Both are empty lists if no medicines found or input is empty.

    Raises:
        ValueError: If no Gemini API key is set in the environment and no
            client was provided.
        google.genai.errors.APIError: On a non-retryable error, or after the
            final attempt fails.

    Example:
        >>> result = standardize_medicines(
        ...     "Patient taking Coumadin 5mg daily and danshen tea"
        ... )
        >>> result.model_dump()
        {"western_medicines": ["Warfarin"], "eastern_medicines": ["Danshen"]}
        >>> # Ready to POST to the HDI API:
        >>> import requests
        >>> conflicts = requests.post(
        ...     "http://127.0.0.1:8000/api/v1/check-conflicts",
        ...     json=result.model_dump()
        ... ).json()
        >>> print(conflicts)
        [{"western_drug": "Warfarin", "tcm_herb": "Danshen", ...}]
    """
    if not user_input or not user_input.strip():
        return StandardizedMedicines()

    if client is None:
        client = genai.Client(api_key=_resolve_api_key())

    response = _generate_with_retry(
        client,
        model=model,
        contents=user_input,
        config=types.GenerateContentConfig(
            temperature=0,  # Deterministic normalization for the fuzzy step.
            response_mime_type="application/json",  # JSON-only output.
            system_instruction=SYSTEM_PROMPT,
        ),
        max_attempts=max_attempts,
    )

    raw = response.text or "{}"
    data = _parse_json_object(raw)

    return StandardizedMedicines(
        western_medicines=_constrain(data.get("western_medicines"), _WESTERN_LOOKUP),
        eastern_medicines=_constrain(data.get("eastern_medicines"), _EASTERN_LOOKUP),
    )


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
    """Parse the LLM's JSON response, tolerating common formatting issues.

    TOLERANCE
    =========
    The LLM is set to JSON mode, so it should return bare JSON. But in practice:
    - Sometimes it wraps in ```json code fences (valid JSON but with fences)
    - Sometimes it has extra whitespace or newlines
    - Rarely, it returns invalid JSON (malformed, incomplete)

    BEHAVIOR
    ========
    - Strips opening fence (``` or ```json) and closing fence
    - Parses the inner JSON
    - Falls back to {} if parsing fails (safe degradation)
    - Validates the parsed object is a dict (not a list or string)

    This ensures a malformed reply degrades gracefully to "no medicines found"
    rather than crashing the intake flow.

    Args:
        raw: Raw string response from the LLM (may include fences/whitespace)

    Returns:
        Parsed dict, or {} if parsing failed
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


def _constrain(values: object, lookup: Dict[str, str]) -> List[str]:
    """Validate and snap medicine names to exact database spelling.

    THE SAFETY NET
    ==============
    Even if the LLM returns names not in the controlled vocabulary, this function
    filters them out. Only names that exist in the database vocab are returned.

    PROCESS
    =======
    1. Type check: Return [] if values is not a list
    2. Iterate: For each item in the list:
       a. Type check: Skip if not a string
       b. Normalize: Trim whitespace, lowercase
       c. Lookup: Find in the vocabulary dict (case-insensitive)
       d. Snap: Use the canonical DB spelling (exact case/punctuation)
       e. Dedup: Skip if we've already added this medicine
    3. Preserve order: Don't sort; keep the LLM's order

    EXAMPLE
    =======
    Input: ["warfarin", "UNKNOWN_DRUG", "ibuprofen", "warfarin"]
    Lookup: {"warfarin": "Warfarin", "ibuprofen": "Ibuprofen", ...}
    Output: ["Warfarin", "Ibuprofen"]
    (Unknown drug dropped, duplicate removed, exact spelling restored)

    Args:
        values: Supposedly a list of medicine names from the LLM
        lookup: Dict of {lowercase_name: database_exact_name}

    Returns:
        List of validated, deduplicated, database-exact medicine names
    """
    if not isinstance(values, list):
        return []
    seen: set[str] = set()
    cleaned: List[str] = []
    for value in values:
        if not isinstance(value, str):
            continue
        canonical = lookup.get(value.strip().lower())
        if canonical and canonical not in seen:
            seen.add(canonical)
            cleaned.append(canonical)
    return cleaned


if __name__ == "__main__":
    # Quick manual check:
    #   echo "Coumadin 5mg daily, 丹参 tea, advil prn, dong quai soup" \
    #     | python standardize.py
    import sys

    text = sys.stdin.read() if not sys.stdin.isatty() else " ".join(sys.argv[1:])
    result = standardize_medicines(text)
    print(json.dumps(result.model_dump(), ensure_ascii=False, indent=2))
