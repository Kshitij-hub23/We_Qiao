# gemini.md — Gemini Integration & Project Context

This file documents how **Google Gemini API** is used in Qiáo and provides comprehensive context for AI agents working on this project.

---

## Project Overview: What is Qiáo?

**Qiáo (橋, "bridge")** is a **medication safety reconciliation + conflict-detection system** for elderly patients in Hong Kong.

### The Problem
Elderly patients often take medicines from **two separate healthcare systems**:
- **Western Medicine (WM):** Prescribed by doctors, tracked in hospitals
- **Traditional Chinese Medicine (TCM):** Herbs from practitioners, often informal

These systems don't communicate. A patient might be on **warfarin** (blood thinner, WM) and **danshen** (blood-thinning herb, TCM) without knowing they interact dangerously.

**Result:** Undiscovered drug-herb interactions → bleeding risk, reduced efficacy, or toxicity.

### The Solution
Qiáo **converges both records into one view** and **flags dangerous interactions**:
1. Patient enters (or uploads) their medicines
2. System extracts the names
3. System deterministically looks up known interactions
4. System shows **explainable alerts** (what, why, severity, sources)
5. Caretaker/clinician makes the final decision

### Core Principle: Fuzzy vs. Deterministic

```
Fuzzy Step (AI-powered, this is where Gemini operates)
  ↓
  Messy input: Photo, handwritten notes, free text
  ↓
  Extract & recognize: "Coumadin" → "warfarin", "丹參" → "danshen"
  ↓
Deterministic Step (Rule-based, no AI guessing)
  ↓
  Look up in database: Is warfarin + danshen a known interaction?
  ↓
  Return: YES → severity, mechanism, sources (all from database, never from LLM)
  ↓
  Human decides: Act on this alert or not?
```

**Critical:** The **safety verdict is never AI-generated.** Gemini extracts names; the database provides the verdict.

---

## Non-Negotiable Principles

1. ✅ **Reconciliation + conflict detection** — NOT a diagnostic tool, NOT medical advice
2. ✅ **Fuzzy extraction only** — Gemini extracts names; the database looks them up
3. ✅ **Explainable, sourced output** — Every flag carries: what, why, severity, source
4. ✅ **Verified data only** — All interactions are curated + sourced from clinical literature
5. ✅ **Server-side keys only** — Gemini API key never exposed to browser
6. ✅ **Synthetic data only** — No real patient data in prototype

---

## System Architecture at a Glance

```
┌─────────────────────────────────────────────────────┐
│              Browser (Patient/Caretaker)            │
│         http://localhost:3000 (Next.js)            │
│                                                     │
│  [Upload image or paste text] → [Show conflicts]   │
└────────────┬────────────────────────────────────────┘
             │
             │ /api/resolve (single call)
             ▼
    ┌────────────────────────┐
    │  Next.js App Routes    │
    │  Proxy both services   │
    └────────┬───────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
  ┌─────────┐  ┌─────────┐
  │ Intake  │  │ Engine  │
  │ Service │  │ (HDI)   │
  │ Port    │  │ Port    │
  │ 8001    │  │ 8000    │
  └────┬────┘  └────┬────┘
       │            │
   Gemini       SQLite DB
   2.5 Flash    (46 medicines,
   (OCR +       51 interactions)
   Extract)
```

**Three independent services, all local during development:**
1. **Intake Service** (8001) — Gemini OCR + extraction
2. **Engine** (8000) — Deterministic conflict lookup
3. **Frontend** (3000) — UI + proxy routes

---

## Data Flow: The Hero Example

**Input:** Patient photo of prescription label

```
┌─ Image: prescription label ──────────────────────┐
│                                                  │
│  "Coumadin 5mg daily"                           │
│  "丹參茶"                                         │
│  "Advil as needed"                              │
└──────────────────────────────────────────────────┘
         ↓
    [OCR via Gemini 2.5 Flash]
         ↓
    ┌─────────────────────────┐
    │ Extracted text (verbatim):   │
    │ "Coumadin 5mg daily"    │
    │ "丹參茶"                 │
    │ "Advil as needed"       │
    └──────────┬──────────────┘
              ↓
       [Extract medicine names via Gemini]
              ↓
    ┌──────────────────────┐
    │ Candidate names:     │
    │ - Coumadin           │
    │ - 丹參               │
    │ - Advil              │
    └──────────┬───────────┘
              ↓
    [Engine: Resolve to entities]
              ↓
    ┌───────────────────────────┐
    │ Canonical names:          │
    │ - Warfarin (E-0003)       │
    │ - Danshen (E-0001)        │
    │ - Ibuprofen (E-0008)      │
    └──────────┬────────────────┘
              ↓
    [Engine: Check for interactions]
              ↓
    ┌──────────────────────────────────────┐
    │ CONFLICTS FOUND:                     │
    │                                      │
    │ ⚠️ MAJOR: Warfarin + Danshen         │
    │   Mechanism: Additive anticoagulant  │
    │   Risk: Increased bleeding           │
    │   Source: PMID 7494191               │
    │                                      │
    │ ⚠️ MODERATE: Warfarin + Ibuprofen    │
    │   ...                                │
    └──────────────────────────────────────┘
```

**Key point:** Gemini's job is steps 1-2 (extract names). The engine does steps 3-5 (lookup, validation, source).

---

## The Dataset: 46 Medicines, 51 Interactions

All clinical data lives in **`hdi-api/Medicine_data/`**:

- **`entities.json`** — 46 drug/herb entries
  - 24 Western medicines (e.g., Warfarin, Aspirin, Ibuprofen)
  - 22 TCM herbs/formulas (e.g., Danshen, Dong quai, Ginkgo)
  - Each has: preferred_name, type, alternative names (Latin, pinyin, Chinese, common names)

- **`interactions.json`** — 51 sourced interaction pairs
  - 30 TCM-WM (herb-drug) interactions ← **What we focus on**
  - 12 WM-WM (drug-drug) interactions
  - 9 TCM-TCM (herb-herb) interactions
  - Each has: agents, severity, mechanism, clinical_effect, management, evidence_level, sources (PMIDs, DOIs, case reports)

**This dataset is the source of truth.** It's loaded into SQLite by `hdi-api/seed.py` and queried by the engine.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js (TypeScript) + React | Intake form, results display |
| **Proxy Routes** | Next.js `/api/*` | Server-side proxies to services |
| **Intake Service** | FastAPI (Python) + Gemini | OCR + medicine name extraction |
| **Conflict Engine** | FastAPI (Python) + SQLite | Deterministic interaction lookup |
| **Database** | SQLite (`hdi.db`) | 46 entities, 51 interactions |
| **Deployment** | Vercel (Next.js) + Railway (APIs) | Cloud hosting |
| **Auth** | Demo-grade (localStorage) | Seeded accounts, not production-ready |

---

## Key Files & What They Do

```
We_Qiao/
├── app/                          # Next.js frontend
│   ├── page.tsx                  # Intake form (enter medicines)
│   ├── api/resolve/route.ts      # Main endpoint: image/text → conflicts
│   └── ...
├── standardizer/                 # Intake service (Gemini OCR + extraction)
│   ├── ocr.py                    # Image → text (Gemini vision)
│   ├── extract.py                # Text → medicine names (Gemini)
│   ├── main.py                   # FastAPI endpoints (port 8001)
│   └── ...
├── hdi-api/                      # Conflict engine
│   ├── main.py                   # FastAPI endpoints (port 8000)
│   ├── database.py               # SQLAlchemy ORM + SQLite
│   ├── seed.py                   # Load JSON → SQLite
│   ├── Medicine_data/
│   │   ├── entities.json         # 46 medicines
│   │   ├── interactions.json     # 51 interactions
│   │   └── SOURCES.md            # Full citations
│   └── ...
├── components/                   # React UI components
├── lib/                          # Shared utilities
├── docs/                         # Architecture, setup, deployment
└── CLAUDE.md, gemini.md         # AI agent guidance
```

---

## Quick Reference: When to Use Gemini

| Task | Service | Model | Purpose |
|------|---------|-------|---------|
| **OCR** | Intake | Gemini 2.5 Flash | Extract text from images (bilingual) |
| **Extract names** | Intake | Gemini 2.5 Flash | Parse text → medicine name candidates |
| **Validate/match** | Engine | SQLite | Look up candidates in database (deterministic) |
| **Decide safety** | Engine | SQLite | Return conflict data (never AI-generated) |

**Remember:** Gemini only does extraction. The engine does validation and safety decisions.

---

## Running the Full Stack

```bash
# Terminal 1: Start engine (port 8000)
cd hdi-api
python seed.py                    # Load dataset
python -m uvicorn main:app --reload --port 8000

# Terminal 2: Start intake (port 8001)
cd standardizer
python -m uvicorn main:app --reload --port 8001

# Terminal 3: Start frontend (port 3000)
npm install && npm run dev

# Now test at http://localhost:3000
```

**Verify each service:**
- Engine: http://127.0.0.1:8000/docs (Swagger UI)
- Intake: http://127.0.0.1:8001/docs (Swagger UI)
- Frontend: http://localhost:3000

---

## What Gemini Does

Gemini handles the **fuzzy step** of the fuzzy-vs-deterministic split (see [`CLAUDE.md`](CLAUDE.md), principle #2).

**Two tasks:**

1. **OCR (Image → Text)**
   - Extract text from prescription photos, labels, handwritten notes
   - Bilingual: English + 繁體中文
   - Handles messy, rotated, partial images
   - Endpoint: `POST /api/v1/ocr` (intake service, port 8001)

2. **Extraction (Text → Medicine Names)**
   - Parse free-text prescription into candidate medicine names
   - Extract raw strings without vocabulary constraint
   - The engine (`hdi-api`) does the deterministic matching
   - Endpoint: `POST /api/v1/extract` (intake service, port 8001)

---

## Integration Points

### Intake Service (`standardizer/`)

The **standalone intake service** (FastAPI, port 8001) wraps Gemini calls.

| File | Purpose |
|------|---------|
| `standardizer/ocr.py` | Image → text (OCR) using Gemini 2.5 Flash |
| `standardizer/extract.py` | Text → medicine names (extraction) using Gemini 2.5 Flash |
| `standardizer/main.py` | FastAPI endpoints (`/api/v1/ocr`, `/api/v1/extract`) |

### Next.js Frontend (`app/api/resolve`)

The frontend proxies both steps in a single `/api/resolve` call:

```
Browser (image or text)
    ↓
Next.js /api/resolve
    ├─→ Call intake service /api/v1/ocr (if image)
    ├─→ Call intake service /api/v1/extract (text → names)
    ├─→ Call engine /api/v1/check-conflicts (validate + match)
    ↓
Browser (conflicts + sources)
```

---

## Environment Setup

### API Key

Required: `GEMINI_API_KEY`

```bash
# In .env or environment
GEMINI_API_KEY=<your-google-gemini-api-key>
```

**Get a key:**
1. Go to https://aistudio.google.com/app/apikeys
2. Create a new API key for Gemini
3. Add to `.env` (gitignored)

**Fallback chain:**
```python
# If GEMINI_API_KEY not set, tries:
1. GOOGLE_API_KEY
2. OPENAI_API_KEY (if it's a valid Google format)
```

### Model

Currently: `gemini-2.5-flash`

**Why this model:**
- Fast (suitable for real-time medicine intake)
- Accurate for OCR (handles Chinese text)
- Cost-effective
- Supports vision (image) tasks

---

## API Contracts

### OCR Endpoint

**Request:**
```json
{
  "image_path": "path/to/prescription.jpg",
  "image_bytes": null,  // Or raw bytes in base64
  "language": "en"      // "en" or "zh" (auto-detect if omitted)
}
```

**Response:**
```json
{
  "text": "Coumadin 5mg daily\n丹參茶 daily",
  "detected_languages": ["en", "zh"],
  "confidence": 0.92
}
```

**What it does:**
- Takes an image (file path or bytes)
- Calls Gemini 2.5 Flash vision API
- Returns extracted text exactly as written (no normalization)
- Detects language(s) present in image

### Extract Endpoint

**Request:**
```json
{
  "text": "Patient on Coumadin 5mg daily, 丹參 tea, Advil as needed"
}
```

**Response:**
```json
{
  "candidate_names": [
    "Coumadin",
    "丹參",
    "Advil"
  ],
  "raw_extraction": "Coumadin, 丹參, Advil"
}
```

**What it does:**
- Takes free-text input
- Calls Gemini 2.5 Flash to extract medicine name strings
- Returns **raw candidates** (no validation or matching)
- The engine does the deterministic matching later

---

## Prompts & Constraints

### OCR Prompt

```
Extract all text from the image exactly as written.
Include dosages, frequencies, instructions, and notes.
If text is handwritten or unclear, output your best guess.
Preserve line breaks and structure.

Return ONLY the extracted text, no commentary.
```

**Key constraint:** Transcribe verbatim, don't normalize or translate.

### Extract Prompt

```
You are extracting medicine names from a free-text prescription.

Your ONLY job is to extract candidate medicine name strings.
Do NOT validate, normalize, or classify them.
Do NOT add medicines that aren't mentioned.

List each medicine name on a new line.
Preserve the exact form as written (brand names, Chinese, pinyin, etc.).

Return ONLY the list of names, one per line, no commentary.
```

**Key constraint:** Extract candidates only; matching happens in the engine.

---

## Usage Examples

### OCR a Prescription Image

```python
import httpx

client = httpx.Client()
response = client.post(
    "http://127.0.0.1:8001/api/v1/ocr",
    json={
        "image_path": "prescription.jpg"
    }
)
print(response.json()["text"])
# Output: "Warfarin 5mg daily\n丹參 tea"
```

### Extract Medicine Names

```python
response = client.post(
    "http://127.0.0.1:8001/api/v1/extract",
    json={
        "text": "Patient on Coumadin 5mg daily and danshen tea"
    }
)
print(response.json()["candidate_names"])
# Output: ["Coumadin", "danshen"]
```

### Full Hero Flow (via Next.js)

```bash
curl -X POST http://localhost:3000/api/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "image_path": "prescription.jpg",
    "patient_id": "P-0001"
  }'
# Returns: conflicts + sources + extracted medicines
```

---

## Rate Limits & Costs

**Gemini 2.5 Flash:**
- Free tier: 15 requests per minute, 1M tokens/day
- Paid tier: Higher limits, charge per token

**Optimize:**
- Cache frequent prescriptions
- Batch process when possible
- Monitor token usage

---

## Error Handling

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized | Missing/invalid API key | Check `GEMINI_API_KEY` in `.env` |
| 429 Rate Limit | Too many requests | Implement exponential backoff + retry |
| 500 Internal | Gemini API error | Check https://status.cloud.google.com/ |
| Image decode error | Corrupted/unsupported format | Use JPEG/PNG; check file size < 20MB |

### Retry Strategy

```python
import time

max_retries = 3
for attempt in range(max_retries):
    try:
        response = client.post(url, json=data)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            wait_time = 2 ** attempt  # Exponential backoff
            print(f"Rate limited. Waiting {wait_time}s...")
            time.sleep(wait_time)
        else:
            raise
```

---

## Design Decisions

### Why Gemini (not ChatGPT)?

1. **Vision API** — Native image support (no separate OCR service)
2. **Cost** — Cheaper for high-volume usage
3. **Latency** — Fast responses (suitable for real-time intake)
4. **Chinese text** — Excellent multilingual support
5. **No context length limits** — Can handle large prescriptions

### Why Extract ≠ Standardize?

**Extract endpoint:**
- Returns raw candidates (e.g., "Coumadin", "丹參", "unknown herb XYZ")
- No vocabulary constraint in prompt
- Fast, minimal processing

**Standardizer service (legacy, unused now):**
- Returns only vocabulary-matched names (e.g., "Warfarin", "Danshen")
- Uses controlled vocabulary in system prompt
- More complex validation

**Current flow:** Extract (loose) → Engine match (strict)

### Why No Normalization in OCR?

Gemini can hallucinate corrected spellings. We transcribe verbatim so the engine can make deterministic decisions about what it recognizes.

---

## Testing

### Manual OCR Test

```bash
# Start intake service
cd standardizer
uvicorn main:app --reload --host 127.0.0.1 --port 8001

# In another terminal
curl -X POST http://127.0.0.1:8001/api/v1/ocr \
  -H "Content-Type: application/json" \
  -d '{"image_path": "test_image.jpg"}'
```

### Manual Extract Test

```bash
curl -X POST http://127.0.0.1:8001/api/v1/extract \
  -H "Content-Type: application/json" \
  -d '{"text": "Coumadin 5mg, danshen tea, Advil as needed"}'
```

### Integration Test (Full Flow)

```bash
# 1. Start all three services
npm run dev              # Next.js, port 3000
python -m uvicorn main:app --reload --port 8001  # Intake
python -m uvicorn main:app --reload --port 8000  # Engine

# 2. Test hero flow
curl -X POST http://localhost:3000/api/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "image_path": "warfarin_danshen.jpg"
  }'
# Should return conflicts with sources
```

---

## Future Improvements

1. **Vision fine-tuning** — Train on prescription images for higher accuracy
2. **Multilingual support** — Add Arabic, Korean, Vietnamese prescriptions
3. **Structured extraction** — Return JSON with dosages, frequencies
4. **Offline fallback** — Local OCR service if Gemini is unavailable
5. **Confidence scoring** — Return confidence for each extracted name

---

## Troubleshooting

### "GEMINI_API_KEY not set"

```bash
# Check .env exists and has the key
cat .env | grep GEMINI_API_KEY

# If missing, add it
echo "GEMINI_API_KEY=<your-key>" >> .env
```

### "Image too large"

Gemini has a 20MB limit per image.

```python
# Compress before sending
from PIL import Image
img = Image.open("large_image.jpg")
img.thumbnail((2048, 2048))
img.save("compressed.jpg", quality=85)
```

### "Timeout after 30s"

Gemini API sometimes takes longer. Increase timeout:

```python
client = httpx.Client(timeout=60.0)
```

---

## References

- **Gemini API Docs:** https://ai.google.dev/
- **Vision API Guide:** https://ai.google.dev/tutorials/vision
- **Pricing:** https://ai.google.dev/pricing
- **Status Dashboard:** https://status.cloud.google.com/

---

## Non-Negotiables

⛔ **NEVER:**
- Expose the `GEMINI_API_KEY` to the browser
- Store prescriptions in Gemini cloud logs (use `safety_settings` to disable)
- Use Gemini for the safety verdict (conflicts, severity) — that's the engine's job
- Prompt Gemini to normalize medicine names — that's the engine's job

✅ **ALWAYS:**
- Read the key from server environment only
- Test with real prescription images before deploying
- Monitor token usage and costs
- Document prompts if you change them
- Log extraction results for auditing
