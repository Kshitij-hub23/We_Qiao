# CLAUDE.md — guidance for AI agents working in this repo

This file tells any AI coding agent (Claude, Gemini, etc.) how to work on **Qiáo**. Read it before
making changes. The full architecture is in [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md).

## What this project is
Qiáo (橋, "bridge") is a **cloud-based reconciliation + conflict-detection system** that converges a
patient's **Western Medicine (WM)** and **Traditional Chinese Medicine (TCM)** records into one view
and flags dangerous drug–herb interactions the two siloed systems miss. Built for the EuroTeQ × Hong
Kong Talent Engage hackathon (HealthTech track), elderly-care focus.

## Non-negotiable principles (do not violate)
1. **Not a chatbot / not a "copilot."** It is a reconciliation + conflict-detection system, never a
   Q&A assistant or diagnostic tool. Do not add chat/conversational features.
2. **Fuzzy vs. deterministic split.** An LLM (the **Gemini API**) handles only the *fuzzy* step —
   reading a free-text or photographed prescription into a structured drug/herb list, and
   normalizing names. The **safety verdict** (is there a conflict? how severe?) is a
   **deterministic lookup** against the curated interaction dataset — **never** model-generated.
3. **Explainable, sourced output.** Every conflict flag must carry: what, why (mechanism + clinical
   effect), severity, and source. No black-box results.
4. **Verified data only; no diagnostic claims.** Surface known interactions and hand the decision to
   a human (caretaker / clinician).
5. **Synthetic patient data only** in this prototype.

## Stack
- **Next.js (TypeScript)**, responsive web app.
- **Supabase** — cloud database, auth, file storage (single region; e.g. Singapore, closest to HK).
- **Gemini API** for fuzzy extraction — **server-side only**, key never exposed to the browser.
- **Vercel** for hosting.
- **Role-based access control:** elderly user, caretaker, TCM practitioner. A caretaker can only see
  patients they are explicitly linked to. Demo-grade auth is fine (seeded accounts) — do not burn
  time on production identity.

## Current implementation (as built — read this before assuming)
The app is now **three local processes**, not the single cloud app the Stack section envisaged:
- **Conflict engine** — `hdi-api/` (FastAPI + SQLite), port **8000**. `POST /api/v1/resolve`
  (deterministic name→entity matching — exact alias + `rapidfuzz` fuzzy fallback, the safety boundary),
  `POST /api/v1/check-conflicts`, `GET /health`. Seed it with `python seed.py` (loads
  `hdi-api/Medicine_data/`); fold the name vocabularies in with `python ingest_herbs.py <csv>` and
  `python ingest_western.py <csv>` (shared core in `ingest_common.py`).
- **Intake service** — `standardizer/` (FastAPI), port **8001**. `POST /api/v1/ocr` (Gemini image OCR)
  + `POST /api/v1/extract` (Gemini name **extraction** — candidate name strings only, **no vocabulary in
  the prompt**; the engine does the matching). Needs `GEMINI_API_KEY`.
- **Next.js frontend** — port **3000**. API routes under `app/api/*` proxy the two services
  server-side (`ENGINE_URL`, `INTAKE_URL`); the browser never holds a key. `/api/resolve` runs
  extract (intake) → resolve (engine) in one call.

What's actually built: a sign-in flow + **patient portal** (dashboard, profile with a system Patient
ID, caregivers with permission-scoped access, read-only caregiver view) and a **bilingual EN / 繁體中文**
UI. **Auth and storage are demo-grade and client-side (`localStorage`)** — Supabase / a real server DB
are still *planned*, not implemented. The two fuzzy steps run on **Gemini** (`gemini-2.5-flash`); the
KIT `OPENAI_API_KEY` is unused. PDF passport export and the audit log are not built yet.

## Running locally (gotchas that bite — read before starting services)
- **Start order:** engine (8000) → intake (8001) → frontend (3000). `.env` (repo root, gitignored)
  holds `GEMINI_API_KEY`; `OPENAI_API_KEY` is legacy/unused. `.env.local` holds `ENGINE_URL` /
  `INTAKE_URL` for the Next.js proxy routes.
- **Run the Python services with `--ws none` and WITHOUT `--reload`.** `--ws none` avoids a
  `websockets.client` ImportError in google-genai. `--reload` causes a flapping restart loop because
  the engine writes `hdi.db` into the watched directory (WatchFiles sees it and restarts).
- **`standardizer/requirements.txt` pins `websockets>=13.0,<15.1`** — websockets 16.0 removed the
  legacy `websockets.client` module that google-genai imports. Do not loosen this pin.
- **Dependencies the engine needs:** `rapidfuzz` (fuzzy match) and `opencc-python-reimplemented`
  (Chinese simplified⇄traditional). Both must be installed or the engine crashes on startup.
- **`share.bat`** (gitignored, root) is a one-click launcher: starts all 3 services + a Cloudflare
  quick tunnel (`cloudflared tunnel --url http://localhost:3000 --protocol http2`), polls the log for
  the random `*.trycloudflare.com` URL, prints it, and copies it to the clipboard. The URL changes
  every launch (free quick tunnels).

## Chinese name resolution (how it works — keep it intact)
The resolver (`hdi-api/resolver.py`) uses **OpenCC** in `normalize_variants()` to expand each input
into simplified⇄traditional + tone-stripped pinyin variants; `seed.py` mirrors this at index-build
time. So storing ONE Chinese form on an entity matches both simplified and traditional input. **Every
WM-drug and TCM-herb the frontend seeds/displays must have a resolvable `chinese`/`common_names`
entry** — the `lib/i18n.tsx` `GLOSSARY` Chinese display term must resolve in the engine, or Chinese
intake fails with "recognized but not in our database". All 24 interaction-relevant + seeded drugs now
carry Chinese names; a discrepancy audit confirmed 0 unresolved seeded names (EN + ZH all exact 1.0).
Watch for classical-vs-common char mismatches OpenCC does NOT bridge (e.g. 黃耆 vs 黃芪, 银杏叶 vs 銀杏) —
add the displayed form as a `common_names` alias.

## Dataset contract (editing the clinical data IS allowed)
The interaction dataset lives in `hdi-api/Medicine_data/` (~756 entities, 51 sourced interactions) and
is loaded by `hdi-api/seed.py`. **You may add to and edit these JSON files directly** — e.g. adding a
missing drug, a synonym/alias, or a Chinese name. After any change, re-run `python hdi-api/seed.py`
to rebuild the SQLite DB and restart the engine. Keep edits accurate and sourced where you assert a
clinical claim (mechanism/severity); pure name additions (aliases, `chinese`, `common_names`) need no
source. The two JSON files follow this schema:
- `entities.json`: `{ entity_id, preferred_name, type ("WM-drug"|"TCM-herb"|"TCM-formula"),
  drug_class, rxnorm_id, latin, pinyin, chinese, common_names[], active_constituents[] }`
- `interactions.json`: `{ id, agent_a_id, agent_b_id, interaction_class ("TCM-WM"|"WM-WM"|"TCM-TCM"),
  severity ("contraindicated"|"major"|"moderate"|"minor"), effect_direction, mechanism,
  clinical_effect, management, evidence_level ("established"|"probable"|"possible"|"theoretical"),
  sources[] }`

## Hero flow (make this work end-to-end first)
Intake (PDF upload + OCR, or text) → Gemini extract & normalize → map to entity ids → converge &
persist to cloud → **deterministic** conflict check → explainable severity-rated alerts → unified
passport (PDF export) + caretaker remote dashboard → tamper-evident audit log.
Hero demo pair: warfarin (WM) + a danshen/dong quai (TCM) formula → high-severity bleeding-risk flag.

## Working conventions
- **Every push updates `README.md`** — including the "Push log" section — so a teammate's LLM can
  follow exactly what changed and what the project uses.
- **Do not create files that weren't requested.** Keep changes scoped and minimal.
- Build the one hero flow excellently before adding breadth. Protect time for the README and the
  2-minute technical video.
- Keep secrets out of the client and out of git (`.env.local` is gitignored).
