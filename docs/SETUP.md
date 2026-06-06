# Development Setup

Complete guide to set up Qiáo locally and run all components.

## Prerequisites

- **Node.js 18+** — for Next.js and npm
- **Python 3.10+** — for the HDI API
- **Git** — for version control
- **SQLite3** (optional) — for inspecting the database directly

---

The app is **three local processes**: the conflict **engine** (`hdi-api/`, :8000), the **intake
service** (`standardizer/`, :8001, does OCR + standardize), and the **Next.js frontend** (:3000).
The intake service needs a `GEMINI_API_KEY` (see Environment variables); the engine and frontend do not.

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/Kshitij-hub23/We_Qiao.git
cd We_Qiao
```

### 2. Engine — terminal 1 (port 8000)

```bash
cd hdi-api
pip install -r requirements.txt
python seed.py                  # load Medicine_data/ into hdi.db (first run only)
python -m uvicorn main:app --reload --ws none --host 127.0.0.1 --port 8000
```
Health check: http://127.0.0.1:8000/health → `{"status":"ok"}`. **`python seed.py` is required** —
without it the database is empty and every check returns "no conflicts."

### 3. Intake service — terminal 2 (port 8001)

```bash
cd standardizer
pip install -r requirements.txt
python -m uvicorn server:app --reload --ws none --host 127.0.0.1 --port 8001
```
Needs `GEMINI_API_KEY` in the repo-root `.env` (used for OCR + standardize). Health: http://127.0.0.1:8001/health.

### 4. Frontend — terminal 3 (port 3000)

```bash
cp .env.example .env.local      # ENGINE_URL=:8000, INTAKE_URL=:8001
npm install
npm run dev                     # http://localhost:3000
```

> **Why `--ws none`?** `uvicorn[standard]` pulls in a `websockets` version whose legacy module it
> tries to import on startup; on some machines that crashes the server. Neither service uses
> websockets, so `--ws none` skips that import. (Tip: just run `start.bat` at the repo root, which
> launches all three with the right flags.)

### 5. Test the flow

1. Open http://localhost:3000 → you're redirected to **/login**.
2. Click **Eleanor Chen** to auto-fill, sign in (password `demo123` for all demo accounts).
3. On the dashboard, click **Check interactions** (Warfarin + Danshen are pre-seeded) → you should see
   a **major** bleeding-risk conflict with its mechanism. (Toggle **中文** to see bilingual mode.)
4. Optional: on the intake page, upload a prescription photo → OCR fills the text → confirm → it's
   standardized and added to the lists.

---

## Full Setup (with environment configuration)

### 1. Environment variables

Two files, both gitignored:

**`.env`** (repo root) — read by the Python intake service:
```bash
# Google Gemini API key — used by BOTH standardizer/ocr.py (OCR) and
# standardizer/standardize.py (name standardization). Falls back to GOOGLE_API_KEY.
# Get one from https://aistudio.google.com/apikey
GEMINI_API_KEY=AIza...
```

**`.env.local`** (repo root) — read by Next.js (`cp .env.example .env.local`):
```bash
ENGINE_URL=http://127.0.0.1:8000   # conflict engine
INTAKE_URL=http://127.0.0.1:8001   # intake service (OCR + standardize)
```

**Note:** the engine (`hdi-api/`) needs **no** key. There is no `OPENAI_API_KEY` requirement — the
standardizer was switched from the KIT OpenAI gateway to Gemini, so that key is unused. Never commit secrets.

---

### 2. Install dependencies

#### Next.js app
```bash
npm install
```

**Installs:**
- `next` — React framework
- `react`, `react-dom` — React library
- `framer-motion` — Animation library
- `zod` — Schema validation
- `tailwindcss` — Utility CSS
- Dev dependencies: TypeScript, type definitions, linting

#### Python — engine (`hdi-api/`)
```bash
cd hdi-api && pip install -r requirements.txt
```
Installs `fastapi`, `uvicorn[standard]`, `sqlalchemy`.

#### Python — intake service (`standardizer/`)
```bash
cd standardizer && pip install -r requirements.txt
```
Installs `fastapi`, `uvicorn[standard]`, `python-multipart`, `pydantic`, `python-dotenv`, and
`google-genai` (the Gemini SDK).

---

### 3. Start the three services

```bash
# Terminal 1 — engine
cd hdi-api && python -m uvicorn main:app --reload --ws none --host 127.0.0.1 --port 8000
# Terminal 2 — intake service
cd standardizer && python -m uvicorn server:app --reload --ws none --host 127.0.0.1 --port 8001
# Terminal 3 — frontend
npm run dev
```

Or just run **`start.bat`** at the repo root, which opens all three with the right flags.

---

### 4. Verify both services

**Browser:**
1. Open http://localhost:3000
2. Check for green "Engine online" indicator at top-right
3. If red/offline, the Python API is unreachable (check Terminal 1)

**Command line (optional):**
```bash
# Test the engine directly
curl http://127.0.0.1:8000/health
# Should return: {"status":"ok"}

# Test the Next.js proxy
curl -X POST http://localhost:3000/api/conflicts/check \
  -H "Content-Type: application/json" \
  -d '{"western_medicines": ["warfarin"], "eastern_medicines": ["danshen"]}'
# Should return: {"ok": true, "conflicts": []}
```

---

## Populating the Database

The tables start empty and are filled from the curated dataset in `hdi-api/Medicine_data/`
(entities.json + interactions.json — 46 entities, 51 sourced interactions) by the seed script:

```bash
cd hdi-api
python seed.py        # idempotent — safe to re-run
```

This is the canonical way to populate the DB (it loads the real clinical data with sources, builds the
alias index, and validates referential integrity). Run it once before starting the engine; re-run it
if the dataset changes.

### Verify data in database

```bash
sqlite3 hdi-api/hdi.db
SELECT * FROM interactions;
```

Should show your inserted rows.

### Now test in the app

1. Go to http://localhost:3000
2. Enter `warfarin` (Western) and `danshen` (TCM)
3. Click "Review & check"
4. You should now see the conflict with severity badge and mechanism

---

## Common Issues

### "Engine offline" (red dot at top-right)

**Problem:** Next.js can't reach the Python API.

**Solutions:**
1. Verify the Python API is running (check Terminal 1)
2. Confirm it's on `http://127.0.0.1:8000`
3. Check firewall (Windows Defender) — allow `python.exe`
4. Manually test: `curl http://127.0.0.1:8000/health`

---

### "Could not reach the app server"

**Problem:** Browser can't reach Next.js.

**Solutions:**
1. Verify Next.js is running (check Terminal 2)
2. Check it's on `http://localhost:3000` (not `127.0.0.1:3000`)
3. Check the browser console for network errors
4. Try a hard refresh (Ctrl+Shift+R)

---

### "Invalid request shape"

**Problem:** Request validation failed (something in the request body is wrong).

**Solutions:**
1. Check the browser console for the exact request/response
2. Verify `western_medicines` and `eastern_medicines` are arrays of strings
3. Check for typos in field names (case-sensitive)
4. Manually test the API: `curl -X POST http://127.0.0.1:8000/api/v1/check-conflicts ...`

---

### "ModuleNotFoundError: No module named 'fastapi'"

**Problem:** Python dependencies not installed.

**Solution:**
```bash
cd hdi-api
pip install -r requirements.txt
```

---

### A uvicorn server exits immediately with a `websockets.legacy` ImportError

**Problem:** `uvicorn[standard]` tries to import a `websockets` legacy module that newer `websockets`
versions removed, crashing startup (often after `pip install` upgraded `websockets`).

**Solution:** start uvicorn with `--ws none` (neither service uses websockets):
```bash
python -m uvicorn main:app --reload --ws none --host 127.0.0.1 --port 8000
```

---

### "The intake service could not be reached at http://127.0.0.1:8001"

**Problem:** Photo/text upload needs the **intake service**, which isn't running (or has no key).

**Solutions:**
1. Start it (terminal 2): `cd standardizer && python -m uvicorn server:app --reload --ws none --port 8001`
2. Ensure `GEMINI_API_KEY` is set in the repo-root `.env`.
3. A `429 RESOURCE_EXHAUSTED` means the Gemini free-tier daily quota is used up — wait for reset or use
   another key. Manual medicine entry on the dashboard does **not** need the intake service.

---

### The app redirects me to /login

**Expected.** The app requires a (demo) sign-in. Use a demo account (click a name to auto-fill,
password `demo123`). Caregiver accounts are created from a patient's profile → Caregivers section.

---

### "TypeError: Cannot read properties of undefined (reading 'conflicts')"

**Problem:** The response shape is wrong (likely API error).

**Solutions:**
1. Check the browser console network tab — what's the actual response?
2. Check Terminal 1 — any Python errors?
3. Restart the Python API: `python -m uvicorn main:app --reload`

---

## Project Structure

```
We_Qiao/
├── app/                          # Next.js app (React UI)
│   ├── page.tsx                  # Intake → confirm → results (conflict checker)
│   ├── login/                    # Sign-in
│   ├── dashboard/                # Patient dashboard (conditions + medicine lists)
│   ├── profile/                  # Profile portal (Patient ID, demographics, caregivers)
│   ├── caregiver/                # Read-only caregiver view
│   ├── layout.tsx                # Root layout (wraps app in LanguageProvider)
│   ├── globals.css               # Design tokens (warm coffee palette)
│   └── api/                      # Next.js API routes (proxies)
│       ├── conflicts/check/      # POST /api/conflicts/check  → engine
│       ├── engine/health/        # GET  /api/engine/health    → engine
│       ├── ocr/                  # POST /api/ocr              → intake service
│       └── standardize/          # POST /api/standardize      → intake service
├── components/                   # React components (see components/README.md)
├── lib/                          # Utilities (see lib/README.md)
│   ├── api-client.ts engine.ts intake.ts types.ts validation.ts   # network seam
│   └── auth.ts demo-users.ts profile.ts caregivers.ts user-records.ts i18n.tsx  # portal
├── hdi-api/                      # Python conflict engine (port 8000)
│   ├── main.py database.py models.py seed.py requirements.txt
│   ├── Medicine_data/            # curated entities.json + interactions.json
│   └── hdi.db                    # SQLite (generated by seed.py)
├── standardizer/                 # Python intake service (port 8001)
│   ├── server.py                 # FastAPI: /api/v1/ocr, /api/v1/standardize, /health
│   ├── ocr.py                    # Gemini image OCR
│   ├── standardize.py            # Gemini name standardization
│   └── requirements.txt
├── docs/                         # Documentation
│   ├── PROJECT_BRIEF.md
│   ├── ARCHITECTURE.md           # This file's reference
│   ├── SETUP.md                  # Setup guide
│   ├── API.md                    # API documentation
│   └── DEPLOYMENT.md             # Deployment guide
├── .env                          # Environment variables (gitignored)
├── .env.example                  # Template for .env
├── .gitignore
├── .gitattributes                # Line ending rules
├── package.json                  # Node.js dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.ts            # Tailwind config
├── CLAUDE.md                     # AI agent guidance
└── README.md                     # Project overview
```

---

## Running Tests

### Next.js / React (not yet implemented)

```bash
npm test          # Run Jest test suite
npm run lint      # Type-check with TypeScript
```

### Python HDI API (not yet implemented)

```bash
cd hdi-api
pytest tests/     # Run pytest suite
```

---

## Debugging

### Next.js dev server

Logs appear in Terminal 2. Look for:
- Build errors
- Route handler errors
- TypeScript errors (if any)

**Browser DevTools:**
- Open http://localhost:3000 → Right-click → Inspect
- Network tab: watch POST/GET requests
- Console: error messages, debug logs

### Python API server

Logs appear in Terminal 1. Look for:
- Request/response logging
- Database errors
- Validation errors

**Manual testing:**
```bash
# Test the POST endpoint
curl -X POST http://127.0.0.1:8000/api/v1/check-conflicts \
  -H "Content-Type: application/json" \
  -d '{"western_medicines": ["warfarin"], "eastern_medicines": ["danshen"]}'

# Test the health endpoint
curl http://127.0.0.1:8000/health
```

---

## Production Deployment

See `docs/DEPLOYMENT.md` for deploying to Vercel, Railway, or other platforms.

Key points:
- Next.js deploys to Vercel (or any Node.js host)
- HDI API deploys separately (Railway, Render, AWS, etc.)
- Set `ENGINE_URL` env var to point to the remote API
- Populate the remote database with `hdi-api` scripts

---

## Next Steps

1. **Populate the database** with real interaction data (see above)
2. **Test the full flow** with Warfarin + Danshen
3. **Add the standardizer endpoint** to handle free-text input (Phase 2)
4. **Set up tests** (Jest for Next.js, pytest for Python)
5. **Deploy** to staging environment (see `docs/DEPLOYMENT.md`)

---

## Help

- **Questions?** Check `docs/PROJECT_BRIEF.md` for the full system design
- **Component details?** See `components/README.md`
- **API details?** See `docs/API.md`
- **Stuck?** Check "Common Issues" section above
