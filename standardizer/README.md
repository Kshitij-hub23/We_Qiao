# Standardizer — Medicine Name Extraction (the fuzzy step)

The **fuzzy step** of Qiáo. An LLM reads unstructured, free-text / OCR'd medicine
input and returns a list of clean **candidate name strings** — nothing more.

> **This module no longer carries a vocabulary.** It used to embed the entire
> medicine list in the prompt and force the model to map onto it. That does not
> scale (we're growing to ~500–600 herbs) and it put the *matching* decision
> inside the LLM. Now the LLM only *extracts* surface names; a deterministic
> index in the engine does the *matching*. The vocabulary never lives in the
> prompt.

---

## The pipeline it belongs to

```
image ──OCR──▶ raw text ──EXTRACT (here, LLM)──▶ candidate names
                                   │
                                   ▼
        RESOLVE (engine /api/v1/resolve, deterministic) ──▶ entity_ids
                                   │
                                   ▼
        CHECK (engine /api/v1/check-conflicts, deterministic) ──▶ conflicts
```

- **Fuzzy (here):** recognize medicine mentions, output their names verbatim in
  the original script, dosages/preparation words stripped. No matching, no
  translation, no safety judgement.
- **Deterministic (engine):** name→entity resolution (`resolver.py`) and the
  safety verdict are pure lookups. See [`../CLAUDE.md`](../CLAUDE.md), principle #2.

---

## What it does

```python
from standardizer.standardize import extract_medicines

extract_medicines("I take Coumadin 5mg daily, 丹参茶, Advil prn, dong quai soup").model_dump()
# {"candidates": ["Coumadin", "丹参", "Advil", "dong quai"]}
```

- Names kept in their **original language/script** (`丹参` stays `丹参`; no
  romanization or translation — the resolver normalizes for matching).
- Dosages, strengths, frequencies, routes, and instructions stripped.
- Generic preparation words stripped (`tea`, `soup`, `茶`, `丸`, …): `丹参茶`→`丹参`.
- De-duplicated (case-insensitive), order preserved.
- Empty / whitespace input returns `{"candidates": []}` without calling the LLM.

The candidates go straight into the engine's `POST /api/v1/resolve`.

---

## Architecture

- **Provider:** Google Gemini API (`google-genai` SDK), model `gemini-2.5-flash`.
- **API key:** `GEMINI_API_KEY` (falls back to `GOOGLE_API_KEY`), read from the
  repo-root `.env` server-side only — never exposed to the browser.
- **Determinism:** `temperature=0` + JSON response mode.
- **Resilience:** transient API errors (429 / 5xx) retried with exponential backoff.
- **Tolerance:** the JSON parser strips stray code fences and degrades to
  `{"candidates": []}` on a malformed reply rather than crashing intake.

The system prompt contains **no medicine list** — only extraction rules.

---

## HTTP service

`server.py` (FastAPI) exposes the fuzzy step over HTTP for the Next.js app:

```
POST /api/v1/ocr       multipart image  -> { "text": "<transcribed>" }
POST /api/v1/extract   { "text": ... }  -> { "candidates": [...] }
GET  /health           liveness probe
```

```bash
cd standardizer
pip install -r requirements.txt
python -m uvicorn server:app --reload --port 8001   # needs GEMINI_API_KEY in ../.env
```

The Next.js `/api/resolve` route calls `/api/v1/extract` (here) then the engine's
`/api/v1/resolve`, so the browser never holds a key and never talks to Gemini.

---

## API reference

### `extract_medicines(user_input, *, client=None, model="gemini-2.5-flash", max_attempts=3) -> ExtractedMedicines`

| Param | Type | Notes |
|---|---|---|
| `user_input` | `str` | Raw medicine text (any language, any format). |
| `client` | `genai.Client` | Optional pre-built client (testing/reuse). If `None`, built from the key. |
| `model` | `str` | Gemini model id. |
| `max_attempts` | `int` | Tries on transient (429/5xx) errors, with backoff. `1` disables retries. |

Returns `ExtractedMedicines(candidates: List[str])`. Raises `ValueError` if no
key is set and no client is provided.

### CLI

```bash
cd standardizer
echo "Coumadin 5mg, 丹参茶, advil prn, dong quai soup" | python standardize.py
# {"candidates": ["Coumadin", "丹参", "Advil", "dong quai"]}
```

---

## Why the vocabulary moved out of the prompt

| Old (vocabulary-in-prompt) | New (extract → resolve) |
|---|---|
| Whole medicine list embedded in the system prompt | No vocabulary in the prompt |
| LLM both recognized **and** matched to a fixed list | LLM only recognizes; the engine matches |
| Didn't scale past a few dozen names | Scales to hundreds of herbs (index lookup) |
| Matching decision inside the model | Matching is deterministic, auditable, the safety boundary |
| Unknown names silently dropped | Unmatched names surfaced, never dropped |

Matching (exact alias + fuzzy fallback, normalization for pinyin tones and
simplified⇄traditional Chinese) now lives in the engine — see
[`../hdi-api/README.md`](../hdi-api/README.md) → `POST /api/v1/resolve`.

---

## Files

| File | Purpose |
|---|---|
| `standardize.py` | `extract_medicines()` — LLM extraction of candidate names |
| `ocr.py` | `extract_text_from_image()` — Gemini image OCR |
| `server.py` | FastAPI service exposing `/api/v1/ocr` + `/api/v1/extract` |
| `README.md` | This file |

---

## Related documentation

- [`../CLAUDE.md`](../CLAUDE.md) — principle #2 (fuzzy vs. deterministic)
- [`../hdi-api/README.md`](../hdi-api/README.md) — the resolver + conflict engine
- [`../HERB_DATASET_SPEC.md`](../HERB_DATASET_SPEC.md) — the herb-vocabulary CSV contract
