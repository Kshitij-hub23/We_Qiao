# Qiáo (橋) — TCM / WM Medication Safety Bridge

A cloud-based reconciliation and **conflict-detection system** for elderly care in Hong Kong. It
converges a patient's **Western Medicine (WM)** and **Traditional Chinese Medicine (TCM)** records
into one view and flags dangerous drug–herb interactions that the two siloed systems miss.

> Built for the EuroTeQ × Hong Kong Talent Engage hackathon (HealthTech track).
> Repository: https://github.com/Kshitij-hub23/We_Qiao

---

## What it is (and is not)

- It **is** a reconciliation + conflict-detection tool. It surfaces *known, sourced* interactions
  and flags them to a human (caretaker / clinician), who decides.
- It is **not** a chatbot, a "copilot", or a diagnostic tool. It never makes diagnostic claims.

### Core design principle
- **Fuzzy step (AI):** an LLM reads a free-text or photographed prescription and turns it into a
  structured drug/herb list (handles Chinese, pinyin, messy text). **Provider: Google Gemini API.**
- **Safety verdict (deterministic):** whether a combination is dangerous comes from a **lookup
  against a curated, sourced interaction dataset** — never from the model guessing. Every flag is
  explainable: *what, why, severity, source.*

---

## Planned stack

| Layer | Choice |
|---|---|
| App | Next.js (TypeScript), responsive web |
| Cloud DB / auth / storage | Supabase (single region) |
| Fuzzy extraction | Google **Gemini** API (server-side key only) |
| Safety engine | Our own deterministic code, fed by a drop-in interaction dataset |
| Hosting | Vercel + Supabase |

All patient data in the demo is **synthetic**. Hero demo case: an elderly patient on **warfarin
(WM)** also taking a **danshen / dong quai (TCM)** formula → high-severity bleeding-risk flag that
neither practitioner saw.

---

## Status

The **application** now exists alongside the docs. The repo is split by branch:

| Branch | Owner | Holds |
|---|---|---|
| `engine` | teammate | the deterministic conflict engine — a Python/FastAPI service in `hdi-api/` |
| `backend` | us | the Next.js app scaffold + our API routes that proxy the engine |
| `frontend` | us | the UI: the "Liquid Glass" design system + the intake → confirm → results flow |
| `main` | shared | docs baseline; integrates `frontend` + `backend` when we're ready |

### What this app does (current scope)
A patient's medicines are entered as text into two lists — **Western** and **Chinese (TCM)** — with
optional file attachments (image/PDF, *not yet processed*). The user confirms, and we send the two
lists to the external engine, then show the severity-rated conflicts it returns. No OCR, accounts,
or database on our side yet — those are deliberately deferred.

### The engine contract (owned by the `engine` branch — we only consume it)
- Runs locally at `http://127.0.0.1:8000` (FastAPI, `hdi-api/`).
- `POST /api/v1/check-conflicts` — body `{ "western_medicines": string[], "eastern_medicines": string[] }`
  → returns `[{ western_drug, tcm_herb, severity, mechanism }]`. Case-insensitive; empty lists → `[]`.
- `GET /health` → `{ "status": "ok" }`.
- **Note:** the engine's database starts empty; it must be populated (teammate's ingestion) for the
  warfarin × danshen demo result to appear.

## Running locally
```bash
# 1. Start the engine (separate terminal) — see hdi-api/README.md on the engine branch
cd hdi-api && pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# 2. Start this app
cp .env.example .env.local      # sets ENGINE_URL=http://127.0.0.1:8000
npm install
npm run dev                     # http://localhost:3000
```
The only configuration is `ENGINE_URL` (where the engine lives); the browser never calls the engine
directly — our `app/api/conflicts/check` route proxies it server-side.

## Documentation
- [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) — the full implementation brief: complete system
  architecture, hard constraints, the dataset contract, and the end-to-end hero flow.
- [`CLAUDE.md`](CLAUDE.md) — guidance for any AI agent working in this repo (principles, stack,
  conventions). Read it before making changes.

## Push log
- **Initial commit:** README with project vision, the fuzzy-vs-deterministic design principle, and
  the planned stack (Gemini for extraction).
- **Add project brief:** `docs/PROJECT_BRIEF.md` with the complete system architecture and
  constraints, plus a README link to it.
- **Add CLAUDE.md:** guidance for AI agents (principles, stack, conventions), linked from the README.
- **`backend` branch — app scaffold + engine proxy:** Next.js (TypeScript) + Tailwind scaffold with the
  Liquid-Glass design tokens, and our backend: `lib/types.ts` (mirrors the engine), `lib/engine.ts`
  (server-side fetch wrapper with timeout + clear errors), `lib/validation.ts` (zod), and routes
  `POST /api/conflicts/check` (proxy to the engine) + `GET /api/engine/health`. A placeholder home page
  confirms the app runs; the real UI lands on `frontend`.
- **`frontend` branch — Liquid-Glass UI + hero flow:** the `lib/api-client.ts` data seam (the only thing
  components import for data) plus a presentational design-system kit (`GlassCard`, `Button`,
  `MedListInput`, `FileAttach`, `ConflictCard`, `SeverityBadge`, `EmptyState`, `LoadingState`,
  `ErrorState`). `app/page.tsx` is a three-step flow: **intake** (two tag inputs for Western / Chinese
  medicines + optional file attach, not yet analysed) → **confirm** → **results** (severity-sorted
  conflict cards, friendly empty/error states, live engine-status pill). Verified end-to-end against the
  engine: warfarin × danshen → a major bleeding-risk flag.
- **`engine` branch — HDI API:** `hdi-api/` — deterministic FastAPI conflict-detection service (empty
  SQLite dataset, `POST /api/v1/check-conflicts` lookup, `GET /health`).
- **Add medicine standardizer:** `standardizer/standardize.py` — the *fuzzy* intake step. Takes
  unstructured free-text prescriptions (English / Chinese / pinyin / Latin) and returns clean,
  de-duplicated `western_medicines` / `eastern_medicines` lists, shaped to drop straight into the HDI
  `/api/v1/check-conflicts` body and into the user's profile. **Provider note:** uses an
  OpenAI-compatible model (`azure.gpt-4.1-mini`) via the KIT SCC `ki-toolbox` gateway rather than
  Gemini; key read server-side from `OPENAI_API_KEY` only. The LLM does fuzzy extraction/normalization
  only — never the safety verdict (CLAUDE.md principle #2).
