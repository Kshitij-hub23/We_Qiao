# Qiáo System Architecture

## System Overview

Qiáo is a **medication conflict-detection bridge** connecting Western Medicine (WM) and Traditional Chinese Medicine (TCM) records for elderly care. It surfaces dangerous drug-herb interactions that siloed systems miss.

```
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER (Patient/Caretaker)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP
                             ▼
         ┌───────────────────────────────────────────┐
         │      Next.js App (port 3000)              │
         │  - /page.tsx: Intake & results UI         │
         │  - /api/conflicts/check: Proxy endpoint   │
         │  - /api/engine/health: Connection probe   │
         └────────┬───────────────────────┬──────────┘
                  │                       │
         (calls)  │                       │
                  ▼                       ▼
        ┌──────────────────┐    ┌────────────────┐
        │ lib/api-client   │    │ lib/engine     │
        │ (browser-facing) │    │ (server-side)  │
        └──────────────────┘    └────────┬───────┘
                                         │
                                  (HTTP) │
                                         ▼
                    ┌────────────────────────────────────┐
                    │   Python HDI API (port 8000)       │
                    │  - /api/v1/check-conflicts (POST)  │
                    │  - /health (GET)                   │
                    │  - SQLite database                 │
                    └────────────────────────────────────┘
```

## Data Flow: Hero Flow (Warfarin + Danshen)

### 1. Intake Phase
```
Patient/Caretaker enters:
  "I take warfarin for heart, and danshen tea"
         │
         ▼
┌─────────────────────────────────┐
│ Standardizer (standardize.py)   │
│ Uses Gemini API to normalize    │
│ (future: server endpoint)       │
└────────────┬────────────────────┘
             │
             ▼
Output: {
  "western_medicines": ["warfarin"],
  "eastern_medicines": ["danshen"]
}
```

### 2. Conflict Check Phase
```
Browser sends: POST /api/conflicts/check
{
  "western_medicines": ["warfarin"],
  "eastern_medicines": ["danshen"]
}
         │
         ▼
Next.js route handler (/api/conflicts/check):
  - Validates schema (lib/validation.ts)
  - Calls lib/engine.checkConflicts()
         │
         ▼
lib/engine.ts (server-side):
  - Forwards to Python HDI API at http://127.0.0.1:8000
  - Handles timeout (8s) and error cases
         │
         ▼
Python HDI API (hdi-api/main.py):
  - Queries SQLite: interactions WHERE western_drug IN ("warfarin")
                               AND tcm_herb IN ("danshen")
         │
         ▼
Returns: [
  {
    "western_drug": "warfarin",
    "tcm_herb": "danshen",
    "severity": "major",
    "mechanism": "Additive anticoagulant effect — increased bleeding risk."
  }
]
```

### 3. Results Display
```
Browser renders conflicts in ConflictCard component:
  - Shows drug + herb pair
  - Color-coded severity badge
  - Mechanism explanation
  - User shares with clinician
```

## Component Layers

### Browser Layer (`app/`)
- **page.tsx**: Main UI, step orchestration (intake → confirm → results)
- **api/conflicts/check**: Proxy endpoint that validates and forwards to the engine
- **api/engine/health**: Liveness probe for connection indicator

### Data Access Layer (`lib/`)
- **api-client.ts**: Browser-facing API (THE ONLY data seam the UI uses)
- **engine.ts**: Server-side wrapper around the Python HDI API
- **types.ts**: Shared TypeScript interfaces (mirrors Python HDI contract)
- **validation.ts**: Zod schema for request validation

### UI Component Layer (`components/`)
- **MedListInput**: Chip/tag entry for medicine names (Enter, comma, Backspace)
- **ConflictCard**: Display a single detected interaction with severity
- **SeverityBadge**: Color-coded severity indicator
- **Button, GlassCard, EmptyState, ErrorState, LoadingState, FileAttach**: Supporting UI

### Fuzzy Step (Future)
- **standardizer/standardize.py**: Gemini API-backed medicine name standardization
  - Takes free-text input (typed, OCR'd, multilingual)
  - Returns split WM/TCM lists
  - Output shape matches HDI API request (ready to POST)

### Deterministic Step (`hdi-api/`)
- **database.py**: SQLAlchemy ORM, SQLite engine, session management
- **models.py**: Pydantic schemas (InteractionRequest, ConflictDetail)
- **main.py**: FastAPI app, /api/v1/check-conflicts endpoint

## Data Contracts

### Browser ↔ Next.js API
```typescript
// Request (POST /api/conflicts/check)
{
  "western_medicines": string[],
  "eastern_medicines": string[]
}

// Response
{
  "ok": true,
  "conflicts": ConflictDetail[]
} | {
  "ok": false,
  "error": string
}
```

### Next.js ↔ Python HDI API
```json
// Request (POST http://127.0.0.1:8000/api/v1/check-conflicts)
{
  "western_medicines": ["warfarin"],
  "eastern_medicines": ["danshen"]
}

// Response (200 OK)
[
  {
    "western_drug": "warfarin",
    "tcm_herb": "danshen",
    "severity": "major",
    "mechanism": "Additive anticoagulant effect..."
  }
]
```

### Python HDI API ↔ SQLite
```
Table: interactions
┌────┬───────────────┬──────────────┬─────────────┬──────────┬──────────────┐
│ id │ western_drug  │ tcm_herb     │ interaction_type │ severity │ mechanism    │
├────┼───────────────┼──────────────┼──────────────────┼──────────┼──────────────┤
│ 1  │ Warfarin      │ Danshen      │ TCM-WM      │ major    │ Additive...  │
│ 2  │ Warfarin      │ Ginkgo       │ TCM-WM      │ moderate │ Enhanced...  │
└────┴───────────────┴──────────────┴──────────────────┴──────────┴──────────────┘
```

## Key Design Principles

### 1. Fuzzy vs. Deterministic Split
- **Fuzzy (AI):** Medicine name standardization via Gemini (handles Chinese, pinyin, OCR mess)
- **Deterministic (DB):** Safety verdict is a pure lookup — never model-generated

### 2. Separation of Concerns
- Browser never talks to the Python engine directly (CORS boundary at Next.js)
- Integration point is isolated in `lib/engine.ts` + `/api/conflicts/check`
- Adding OCR/extraction endpoints later only requires extending `lib/api-client.ts` and routes

### 3. Single Source of Truth
- Types defined once in `lib/types.ts`
- Mirrors the Python HDI API contract exactly
- Changes to one side require explicit contract negotiation

## Error Handling

### Browser → Next.js
- Invalid JSON: 400 Bad Request
- Schema validation fails: 400 Invalid request shape
- Engine unreachable: 502 Bad Gateway
- Engine timeout: 502 Bad Gateway (8s timeout)
- Unexpected error: 500 Internal Server Error

### Next.js → Engine
- Timeout: throws `EngineUnavailableError`
- Bad HTTP status: throws `EngineUnavailableError`
- Network error: caught, user sees "Could not reach the app server"

## Deployment Architecture

### Development
- Next.js app: `npm run dev` (port 3000)
- HDI API: `python -m uvicorn main:app --reload` (port 8000)
- Both connect via `http://127.0.0.1:8000`

### Production
- Next.js app: Deployed to Vercel
- HDI API: Deployed separately (e.g., Railway, Render, or AWS)
- Next.js connects via `process.env.ENGINE_URL` (set to remote HDI API URL)

## Future Expansions

### Extraction Endpoints (Phase 2)
```
POST /api/extraction/upload-pdf
POST /api/extraction/extract-text
└─ Calls standardizer via Gemini
└─ Returns split WM/TCM lists
```

### Patient Profiles (Phase 3)
```
POST /api/patients/:id/medicines
GET /api/patients/:id/history
└─ Persist intake results
└─ Compare with historical records
└─ Track interaction changes
```

### Clinical Audit Log (Phase 4)
```
POST /api/audit/flag-interaction
GET /api/audit/logs
└─ Who checked, when, result
└─ Tamper-evident record
```

## Testing Strategy

- **Unit tests:** lib/ utilities (api-client, validation schemas)
- **Integration tests:** app/api routes with mock engine
- **E2E tests:** Playwright tests of the full intake → results flow
- **HDI API tests:** FastAPI TestClient for database queries and conflict logic
