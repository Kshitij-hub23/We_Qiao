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
| Auth / storage | **Currently:** demo-grade, client-side (`localStorage` sessions + records). **Planned:** Supabase (single region) for real accounts + a server database |
| Fuzzy extraction | **Google Gemini API** — `gemini-2.5-flash` for both OCR and standardization (server-side key only) |
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
| `engine` | teammate | the deterministic conflict engine (`hdi-api/`) + the intake service (`standardizer/`) |
| `backend` | us | the Next.js app scaffold + our API routes that proxy the engine/intake |
| `frontend` | us | the "Liquid Glass" (warm coffee) design system + the intake → confirm → results flow |
| `users` | us | the patient portal: login/auth, dashboard, profile, caregivers, bilingual i18n |
| `main` | shared | everything above is now **merged here** — `main` is the complete, runnable app |

### What this app does (current scope)
The app is a small **patient portal**. A user signs in or **self-registers** at `/register` (choosing
patient / caretaker / practitioner) and lands on a role-aware home. A **patient** sees a **dashboard**
of their conditions and **Western** / **Chinese (TCM)** medicine lists, plus a **profile** page
(Patient ID, demographics, emergency contact, insurance) with a **caretakers** section — the patient
links a trusted caretaker **by their existing account email** and grants permission-scoped access. A
**caretaker** gets a doctor-style **roster** of every patient who has linked them and a read-only
per-patient view (cannot edit conditions/medicines, but can run the conflict check). A **practitioner**
gets their own patient roster with full edit access.

To add medicines, a user uploads a prescription photo (or types into a text box). The image is OCR'd
by the **intake service** (Gemini), the text is shown for the user to confirm/edit, then it is
**extracted** into candidate names (Gemini) and **resolved** to known entities by the engine's
deterministic matcher (exact alias + fuzzy fallback). Confident matches merge into the lists
(additive, de-duplicated); low-confidence (fuzzy) matches wait for the user to confirm, and names that
match nothing are surfaced as "recognized but not in the interaction database" — never silently dropped.
The Western + Chinese lists are sent to the engine, which returns the severity-rated conflicts. The whole UI is **bilingual (English / 繁體中文)** via a header toggle, and
clinical term names are localized for display.

**Auth and storage are demo-grade and client-side:** sessions and records live in the browser
(`localStorage`); there is no server database or real identity yet (see "Planned stack").

### The engine contract (`hdi-api/` — we only consume it)
- Runs locally at `http://127.0.0.1:8000` (FastAPI, `hdi-api/`).
- `POST /api/v1/resolve` — body `{ "candidates": string[] }` → `{ matched: [{ candidate, entity_id,
  preferred_name, type, score, method, requires_confirmation }], unmatched: string[] }`. The
  deterministic name→entity matcher (exact alias + `rapidfuzz` fuzzy fallback; normalizes pinyin tones
  and simplified⇄traditional Chinese). This is the safety boundary — only resolved entities reach the check.
- `POST /api/v1/check-conflicts` — body `{ "western_medicines": string[], "eastern_medicines": string[] }`
  → returns the full sourced record per interaction `[{ western_drug, tcm_herb, severity, mechanism,
  effect_direction, clinical_effect, management, evidence_level, sources[] }]`. Case-insensitive +
  alias-aware; empty lists → `[]`. Our `app/api/conflicts/check` proxy then **projects by viewer role**
  (patients/caretakers: severity only; practitioners: the full record).
- `GET /health` → `{ "status": "ok" }`.
- **Note:** the engine's tables start empty; run `python seed.py` (loads `hdi-api/Medicine_data/`) for the
  warfarin × danshen demo result to appear.

## Running locally

**One-time setup** (Windows / PowerShell). The Python services run from a project-local virtualenv
(`.venv`) so they never pick up the wrong system Python — the `dev:*` scripts call `.venv` explicitly:
```powershell
py -3.12 -m venv .venv                                            # create the isolated interpreter
.venv\Scripts\python -m pip install -r hdi-api\requirements.txt -r standardizer\requirements.txt
.venv\Scripts\python hdi-api\seed.py                             # build the interaction DB
copy .env.example .env.local                                     # ENGINE_URL=:8000, INTAKE_URL=:8001
npm install                                                      # needs GEMINI_API_KEY in .env
```

**Then start everything with one command (from the repo root):**
```bash
npm run dev:all   # engine :8000 + intake :8001 + frontend :3000, colour-coded, Ctrl-C stops all
```
> Do **not** pass `--reload` to the Python services. The engine writes `hdi.db` into its own folder,
> so `--reload` makes WatchFiles restart in a flapping loop. `npm run dev:all` omits it deliberately.

Prefer separate terminals? `npm run dev:engine`, `npm run dev:intake`, and `npm run dev:web` are the
individual pieces. To demo on a phone, `share.bat` (gitignored) launches all three plus a Cloudflare
tunnel and prints the public URL.
The browser never calls the engine, Gemini, or KIT directly — the `app/api/*` routes proxy them
server-side (`ENGINE_URL` for conflicts, `INTAKE_URL` for OCR + standardize).

## Documentation

**Get started:**
- [`docs/SETUP.md`](docs/SETUP.md) — 5-minute quick start: install, run, and test locally
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System diagram, data flow, component breakdown

**Reference:**
- [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) — Full implementation brief, constraints, dataset contract
- [`docs/API.md`](docs/API.md) — All API endpoints, examples, error handling
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Deploying to Vercel, Railway, or self-hosted
- [`CLAUDE.md`](CLAUDE.md) — Principles and conventions for AI agents working in the repo

**Component guides:**
- [`app/README.md`](app/README.md) — Next.js app structure, routes, styling
- [`components/README.md`](components/README.md) — React component catalog with prop docs
- [`lib/README.md`](lib/README.md) — Utilities: conflict-check (api-client, engine, types, validation),
  intake (intake), and the portal layer (auth, demo-users, profile, caregivers, user-records, i18n)
- [`hdi-api/README.md`](hdi-api/README.md) — Python HDI API: database schema, endpoints, population
- [`standardizer/README.md`](standardizer/README.md) — Medicine name standardization (fuzzy step)

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
- **Populate the HDI dataset:** dropped the curated `hdi-api/Medicine_data/` (46 entities, 51 sourced
  interactions — 30 TCM-WM, 12 WM-WM, 9 TCM-TCM) into the engine. Reworked `hdi-api/database.py` to the
  dataset's normalized model (`entities`, `entity_aliases`, class-agnostic `interactions` holding all
  three classes + explainability fields), added `hdi-api/seed.py` (idempotent ingestion + alias index),
  and updated `/api/v1/check-conflicts` to resolve names via aliases (brand / pinyin / latin / Chinese)
  and match **TCM-WM** only — WM-WM and TCM-TCM are stored for later. **Public request/response contract
  unchanged**, so the frontend is unaffected. Verified end-to-end: warfarin × danshen → major flag.
- **Constrain standardizer to the DB vocabulary:** `standardizer/standardize.py` now carries
  `DATABASE_MEDICINES` — the exact 24 WM + 22 TCM `preferred_name`s from the HDI database — and a prompt
  that forces the LLM to map free-text onto that controlled list only. Output is then validated against
  the vocabulary (case-insensitively, snapped to canonical spelling), so the standardizer can never emit
  a medicine the engine doesn't know. Regenerate the lists from the DB if the dataset changes (command in
  the file header).
- **Add image OCR (intake step):** `standardizer/ocr.py` — `extract_text_from_image()` transcribes a
  prescription/label image (English, Chinese, or mixed) to verbatim text using **Gemini 2.5 Flash**
  (`google-genai`), the first step of the hero flow (image → OCR → standardize → check-conflicts).
  Accepts a file path or raw bytes, infers MIME type, transcribes only (no translation/normalization).
  Key read server-side from `GEMINI_API_KEY` (falls back to `GOOGLE_API_KEY` / `OPENAI_API_KEY`).
  Verified live against a bilingual test image. Later: exponential-backoff retry on transient (429/5xx)
  Gemini errors.
- **Wire the intake pipeline into the app:** new `standardizer/server.py` (FastAPI) exposes the OCR +
  standardize functions over HTTP (`POST /api/v1/ocr`, `POST /api/v1/standardize`), kept separate from
  the deterministic engine. Next.js gains `lib/intake.ts` + `app/api/ocr` and `app/api/standardize`
  proxy routes (`INTAKE_URL`, default `:8001`) and `ocrImage`/`standardizeText` in the api-client. The
  intake page now has a **single text box** (replacing the two tag inputs): upload a prescription photo
  → OCR fills the box → user confirms/edits → "Confirm & add to profile" standardizes and **merges into
  the profile** (Western/TCM, additive, de-duplicated, persisted to `localStorage`) → check conflicts.
  Verified end-to-end through the proxy; build + typecheck clean. **Known gap (now fixed, see next):** the
  KIT `gpt-4.1-mini` standardizer was unreliable on *Chinese* herb names.
- **Switch standardizer to Gemini 2.5 Flash:** `standardize.py` now calls the Google Gemini API
  (`gemini-2.5-flash`, JSON response mode, temperature 0, same retry/backoff as OCR) instead of the KIT
  `ki-toolbox` OpenAI endpoint — unifying both intake steps on one provider/key (`GEMINI_API_KEY`) and
  dropping the `openai` dependency. The controlled-vocabulary prompt + output validation are unchanged.
  This **resolves the Chinese-herb gap**: `绿茶与生姜` → Green tea, Ginger; `当归, 甘草, 银杏` → Dong quai,
  Licorice, Ginkgo; mixed EN+ZH maps correctly. (`OPENAI_API_KEY` / the KIT key is now unused.)
- **`users` branch — patient portal:** a sign-in flow (`app/login`) with demo-grade, `localStorage`
  sessions (`lib/auth.ts`, `lib/demo-users.ts`); a role-aware **dashboard** (`app/dashboard`) showing
  conditions + Western/TCM medicine lists; a **profile** portal (`app/profile`) with an immutable
  system **Patient ID** (`lib/profile.ts`), demographics, and a **caregivers** section
  (`lib/caregivers.ts`, `components/CaregiverSection.tsx`) — invite a caregiver, generate credentials,
  set per-section permissions; and a read-only **caregiver view** (`app/caregiver`) honoring those
  permissions. New shared components: `DashboardNav`, `MedListCard`, `ConfirmDialog`, `SegmentedControl`.
- **Safe deletion + prescription type:** every medical-info deletion goes through a mandatory two-step
  `ConfirmDialog`. The intake adds a Western/TCM `SegmentedControl` (no dropdown) before file upload.
- **Bilingual EN / 繁體中文:** `lib/i18n.tsx` provides a dictionary + `LanguageProvider`/`useT` and a
  `LanguageToggle`; `localizeTerm`/`useTerm` translate stored clinical names for *display only* (stored
  values stay canonical English so the engine lookup and delete-by-value keep working).
- **Warm "coffee" rebrand:** retuned the design tokens (`tailwind.config.ts`, `app/globals.css`) from the
  blue/teal palette to a warm espresso/terracotta scheme, with a single dark-brown bullet/indicator colour.
- **Merge `users` → `main`:** the portal, i18n, and the engine/intake/docs work now live together on
  `main` — the complete runnable app. Conflict-free (disjoint file sets).
- **Entity-linking re-architecture (extract → resolve → check):** the medicine vocabulary no longer
  lives in the LLM prompt — it doesn't scale to ~500–600 herbs and it put matching inside the model.
  Now the LLM only **extracts** candidate name strings (`standardizer/standardize.py` →
  `extract_medicines`, `POST /api/v1/extract`; vocabulary removed), and a new deterministic **resolver**
  on the engine does the matching (`hdi-api/resolver.py`, `POST /api/v1/resolve`): normalize (lowercase,
  tone-stripped pinyin, OpenCC simplified⇄traditional) → exact alias → `rapidfuzz` fuzzy fallback over
  the in-memory alias set. The resolver is the **safety boundary** — only resolved `entity_id`s enter
  the unchanged `check-conflicts`; low-confidence fuzzy matches carry `requires_confirmation` (a human
  confirms them in the UI), and `unmatched` names are surfaced, never dropped. Added `ingest_herbs.py`
  (folds a herb-vocabulary CSV per `HERB_DATASET_SPEC.md` into `entities.json`, **preserving entity_ids
  by name** so interaction links survive, carrying over referenced herbs the CSV omits) + a tiny
  `mock_herbs.csv` so the real CSV is a drop-in. `seed.py` alias build extended with the same
  normalization; new deps `rapidfuzz` + `opencc-python-reimplemented`. Frontend rewired: `/api/resolve`
  runs extract→resolve, the intake page auto-adds confident matches and shows confirm/unmatched bands
  (EN/繁體中文). Verified end-to-end: warfarin × danshen → major flag; 丹参/丹參/dānshēn → exact `E-0001`;
  `danshne` → fuzzy (confirm); unknown → unmatched; ingest preserves `E-0001` and assigns new ids above
  the WM block; typecheck + `npm run build` clean. **Note:** the live Gemini call needs a valid
  `GEMINI_API_KEY` — the key in `.env` was reported leaked/revoked by Google and must be rotated.
- **Ingest the real herb vocabulary:** ran `ingest_herbs.py` on the provided `TCM_HERBS_DATASET.csv`
  (332 herbs) → **354 entities, 2150 aliases, 51 interactions** in the engine. 19 of the 22
  interaction-referenced herbs matched the CSV by name and kept their ids (CSV spellings merged in as
  aliases — e.g. the CSV's "Salvia Root" / "丹參" now resolves to the curated **Danshen** `E-0001`); the 3
  not in this Chinese-herb CSV (Garlic, St John's Wort, Veratrum) were carried over with their links
  intact; 308 new herbs got fresh ids above the WM block. Switched the fuzzy scorer to
  `token_sort_ratio` (WRatio over-matched junk at scale — `"totally unknown zzz"`→0.90; now unmatched),
  keeping real typos (`danshne`→Danshen, confirm) working.
- **Ingest the Western-drug vocabulary (same pipeline as herbs):** refactored the ingest into a shared core
  (`hdi-api/ingest_common.py`) and added `ingest_western.py` alongside `ingest_herbs.py`. Ran the provided
  `WESTERN_MEDICATIONS_DATASET.csv` (439 drugs); with both CSVs the engine now holds **756 entities, 3336
  aliases, 51 interactions**. The merge core was hardened: it now keeps every existing entity (curated links
  never dangle — no carry-over step), preserves curated ids by name across *both* kinds (so `Glucophage`→
  **Metformin** `E-0124`, and a herb sold as a supplement like **ginger** that appears in both CSVs stays a
  single entity instead of duplicating across types), and collapses literal duplicate rows on a
  high-precision identity (Chinese+Latin for herbs, generic name for drugs) so genuinely distinct entries
  sharing a loose English name (白术 vs 蒼朮 "Atractylodes") are *not* merged. Verified live end-to-end:
  "Lipitor … Coumadin … 丹参茶 … Synthroid" → brands resolve to Atorvastatin / Warfarin / Danshen /
  Levothyroxine, and Warfarin × Danshen still flags **major**.
- **DX: one-command dev + OCR review dialog + traffic-light severity + logo-to-home:** added `npm run
  dev:all` (via `concurrently`) to boot engine :8000 + intake :8001 + frontend :3000 with one command,
  colour-coded and Ctrl-C-stops-all; removed the flapping `--reload` from `share.bat` (the engine writes
  `hdi.db` into its own watched folder). The Qiáo logo now returns to the role's home page via a shared
  `landingFor()` in `lib/auth.ts` (was a hardcoded `/`). Severity colours are now traffic-light coded
  (contraindicated/major = red, moderate = orange, minor = green) in `tailwind.config.ts`. New
  `components/OcrReviewDialog.tsx`: the moment a prescription scan finishes, a pop-up shows the extracted
  text in an editable box — the user confirms (text flows into the intake box) or retries the scan.
- **Pin the Python services to a project venv:** root cause of recurring `ModuleNotFoundError`s was four
  Python installs on PATH — `pip install` and `python` resolving to different interpreters. Created
  `.venv` (Python 3.12, gitignored) with both requirement sets installed, and pointed `dev:engine` /
  `dev:intake` (and `share.bat`) at `.venv\Scripts\python` explicitly so they can never drift to the
  wrong interpreter again. Setup is now `py -3.12 -m venv .venv` once; thereafter `npm run dev:all`.
- **Root path is now an auth gate, not the tool:** opening `localhost:3000` used to dump you straight
  into the conflict-checker. The checker moved to `/check`; `/` is now a pure redirect — no session →
  `/login`, signed in → the role's home (`landingFor`). Dashboard links + `goCheck` updated to `/check`.
- **Self-registration + multi-patient caretaker portal:** added a `/register` page with a three-way role
  chooser (patient / caretaker / practitioner) and a role-specific form; new `lib/accounts.ts` is the
  unified registered-account store (`localStorage`, keyed by email), and `lib/auth.ts` `login()` now
  checks demo users → registered accounts (the old patient-generated caregiver credential path is gone).
  Registration auto-signs-in and lands on the role's home; `/login` gained a "Create an account" link.
  The **caretaker portal is now a doctor-style roster**: `/caregiver` lists every patient who has linked
  the caretaker, and a new `/caregiver/[patientId]` shows that patient's record **read-only** (permission-
  scoped) — the caretaker **cannot edit** conditions or medicines, but **can run** the deterministic
  conflict check. Linking changed in the patient profile (`components/CaregiverSection.tsx`): instead of
  generating a login, the patient **links an existing caretaker account by email** (`linkCaregiver` in
  `lib/caregivers.ts`, with `not_found` / `already_linked` errors); a caretaker can now be linked to many
  patients via a reverse index, surfaced through `getCaretakerPatients()` in `lib/patients.ts`. Role
  string consolidated on `caretaker` (routes recognize the legacy `caregiver` too). New i18n keys
  (`register.*`, `care.*`, updated `cg.*`) in EN + 繁體中文. Typecheck clean. Also seeded one demo link
  (James Wong → Eleanor Chen) so the caretaker roster isn't empty on first load.
- **Mobile nav fix:** the `DashboardNav` right-side cluster (language toggle + role badge + avatar +
  Sign out) overflowed off-screen on narrow phones. Sign out is now an **icon-only** button on mobile
  (labelled text returns at `sm:`+), gaps/padding are tighter, the logo shrinks slightly on mobile, and
  the toggle/avatar/logout are `shrink-0` so the bar can't overflow. Verified at 360 px in EN + 繁體中文,
  including the caretaker roster, the read-only patient detail, and a live conflict check.
- **Patient PDF export:** new **Export details** button on the dashboard (under "Add a new prescription")
  produces a formatted **health-passport PDF**. `lib/export-pdf.ts` is dependency-free — it builds a
  self-contained, styled HTML document (large bold patient name + Patient ID header rule, then sectioned
  Personal details / Emergency contact / Insurance grids, Conditions, and Western + Chinese medicines as
  pills) and opens it in a print window for **Save as PDF** (Blob fallback if popups are blocked). Pulls
  the full record from `getProfile()` + the dashboard's condition/medicine lists, respects the EN / 繁體中文
  language choice, and localizes clinical terms via the i18n glossary. New `dash.export.*` keys in both
  languages. Typecheck clean.
- **One-click PDF download:** upgraded the export from a print-dialog to a direct download. `lib/export-pdf.ts`
  now renders the styled passport off-screen, rasterizes it with **html2canvas**, and writes a real
  multi-page A4 PDF via **jsPDF** that the browser downloads immediately (`Qiao-<name>-<patientId>.pdf`).
  Rasterizing through the browser means 繁體中文 renders with the system CJK font. Both libs are lazy-imported
  (only loaded on export); the button shows a "Preparing PDF…" busy state. New deps: `jspdf`, `html2canvas`.
- **Copy polish:** removed em dashes from all user-facing text (login/dashboard disclaimers, intake/OCR
  prompts, taglines, PDF passport strings, empty-value placeholders) in both EN + 繁體中文, rewording with
  professional punctuation. Renamed the "Chinese medicines (TCM)" label to **"Traditional Chinese Medicines"**
  everywhere it appears in the UI and PDF (zh: 傳統中藥). Typecheck clean.
- **Role-based conflict detail:** the conflict engine now returns the full sourced record
  (`effect_direction`, `clinical_effect`, `management`, `evidence_level`, `sources[]` — previously stored
  but discarded), and detail is **gated by who is viewing**. The `app/api/conflicts/check` proxy projects
  the engine response to a `view`: **patients & caretakers see severity (and the drug pair) only**, while
  **practitioners see everything** — mechanism, effect direction, clinical effect, management, and linked
  study references (PMID/DOI/PMC). Stripping happens server-side, so clinical detail never reaches a
  non-clinician's browser; `view` defaults to the safe minimum. `ConflictCard` renders summary vs. clinical
  (sources shown as links); the doctor portal opts into `"clinical"`, all other call sites get summary.
  New EN + 繁體中文 `conflict.*` strings. Verified end-to-end through the proxy (summary → 3 fields;
  clinical → full record) and `npm run build` clean.
