# Development Setup

Complete guide to set up Qiáo locally and run all components.

## Prerequisites

- **Node.js 18+** — for Next.js and npm
- **Python 3.10+** — for the HDI API
- **Git** — for version control
- **SQLite3** (optional) — for inspecting the database directly

---

## Quick Start (5 minutes)

### 1. Clone the repository

```bash
git clone https://github.com/Kshitij-hub23/We_Qiao.git
cd We_Qiao
```

### 2. Start the Python HDI API

```bash
cd hdi-api
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Server is live at **http://127.0.0.1:8000**
- Interactive docs: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

**Keep this terminal open** (or run in a separate background process).

### 3. Start the Next.js app (in a new terminal)

```bash
npm install
npm run dev
```

App is live at **http://localhost:3000**

### 4. Test the flow

1. Open http://localhost:3000 in your browser
2. Enter a Western medicine: `warfarin`
3. Enter a TCM herb: `danshen`
4. Click "Review & check"
5. You should see **"No conflicts found"** (empty database)

**Both services are now running.** You can now populate the database and test the full flow.

---

## Full Setup (with environment configuration)

### 1. Environment variables

Create `.env` in the repo root:

```bash
# .env (add to .gitignore)

# Python: Gemini API key (used by standardizer/standardize.py)
# Get from https://aistudio.google.com/app/apikeys
OPENAI_API_KEY=sk-...

# Next.js: Optionally override the engine URL (default: http://127.0.0.1:8000)
# Use this when deploying the API to a remote server
# ENGINE_URL=https://my-hdi-api.railway.app

# (Add more as needed)
```

**Note:** `.env` is in `.gitignore` — never commit secrets.

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

#### Python HDI API
```bash
cd hdi-api
pip install -r requirements.txt
```

**Installs:**
- `fastapi` — Web framework
- `uvicorn[standard]` — Server
- `sqlalchemy` — ORM for SQLite

---

### 3. Start both services

**Terminal 1 — HDI API:**
```bash
cd hdi-api
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 — Next.js app:**
```bash
npm run dev
```

Both should show "Ready" / "Ready in Xms" messages.

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

The `interactions` table starts empty. Add test data:

### Quick test data (Python)

```bash
cd hdi-api
python
```

```python
from database import SessionLocal, Interaction, init_db

init_db()
db = SessionLocal()

# Add the hero example
db.add(Interaction(
    western_drug="Warfarin",
    tcm_herb="Danshen",
    interaction_type="TCM-WM",
    severity="major",
    mechanism="Additive anticoagulant effect — increased bleeding risk."
))

# Add a few more examples
db.add(Interaction(
    western_drug="Warfarin",
    tcm_herb="Ginkgo",
    interaction_type="TCM-WM",
    severity="moderate",
    mechanism="Enhanced anticoagulant activity — may increase bleeding tendency."
))

db.commit()
db.close()
print("Data added successfully!")
```

Exit Python and restart the server:
```bash
# (Press Ctrl+C to stop uvicorn)
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

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
│   ├── page.tsx                  # Main page
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Design tokens
│   └── api/                      # Next.js API routes
│       ├── conflicts/check/      # POST /api/conflicts/check
│       └── engine/health/        # GET /api/engine/health
├── components/                   # React components
│   ├── MedListInput.tsx
│   ├── ConflictCard.tsx
│   ├── SeverityBadge.tsx
│   ├── Button.tsx
│   ├── GlassCard.tsx
│   ├── FileAttach.tsx
│   ├── LoadingState.tsx
│   ├── EmptyState.tsx
│   └── ErrorState.tsx
├── lib/                          # Utilities
│   ├── api-client.ts             # Browser data access
│   ├── engine.ts                 # Server-side engine wrapper
│   ├── types.ts                  # Shared TypeScript interfaces
│   └── validation.ts             # Zod schemas
├── hdi-api/                      # Python HDI API
│   ├── main.py                   # FastAPI app
│   ├── database.py               # SQLAlchemy ORM
│   ├── models.py                 # Pydantic schemas
│   ├── requirements.txt          # Dependencies
│   └── hdi.db                    # SQLite database (generated)
├── standardizer/                 # Gemini-backed medicine standardization
│   └── standardize.py            # Fuzzy extraction (future: API endpoint)
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
