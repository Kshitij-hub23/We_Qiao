# Next.js App — Qiáo UI

The browser-facing React application for Qiáo. Handles the intake flow (enter medicines), validation, and conflict results display.

## Structure

```
app/
├── page.tsx                    # Main page: intake/confirm/results orchestration
├── layout.tsx                  # HTML skeleton, metadata, global styles
├── globals.css                 # Tailwind + design tokens
├── api/
│   ├── conflicts/
│   │   └── check/
│   │       └── route.ts        # POST /api/conflicts/check (proxy to engine)
│   └── engine/
│       └── health/
│           └── route.ts        # GET /api/engine/health (liveness probe)
```

## Key Files

### page.tsx — Main UI orchestration

**Purpose:** Manages the three-step intake flow.

**Flow:**
1. **Intake step** — User enters Western and TCM medicine lists via chip inputs
2. **Confirm step** — User reviews the lists before sending
3. **Results step** — Display detected conflicts sorted by severity

**State:**
- `step`: "intake" | "confirm" | "results"
- `western`: string[] — Western medicine names
- `eastern`: string[] — TCM herb/formula names
- `conflicts`: ConflictDetail[] — Detected interactions
- `engineUp`: boolean | null — HDI API connection status

**Key functions:**
- `runCheck()` — Calls `checkConflicts()` from lib/api-client, handles errors
- `reset()` — Return to intake step after viewing results

**Component hierarchy:**
```
Home
├── Header (title + engine status)
├── AnimatePresence (fade between steps)
│   ├── Intake step
│   │   ├── MedListInput (Western)
│   │   ├── MedListInput (TCM)
│   │   └── FileAttach
│   ├── Confirm step
│   │   ├── SummaryList (Western)
│   │   └── SummaryList (TCM)
│   └── Results step
│       ├── LoadingState / ErrorState / (conflicts list)
│       └── ConflictCard[] (sorted by severity)
└── Disclaimer
```

### layout.tsx — HTML structure

**Purpose:** Root layout for all pages.

**Responsibility:**
- Set page title, description, viewport metadata
- Render the `<html>` and `<body>` tags
- Global CSS is imported here (globals.css)

**Metadata:**
- `title`: "Qiáo · 橋 — Medication Safety Bridge"
- `description`: Explains the tool is for reconciliation, not diagnosis
- `viewport`: Device-width 1:1 scale, theme color matches design

### globals.css

**Purpose:** Design tokens and utility classes.

**Contains:**
- Tailwind configuration (colors, spacing, transitions)
- CSS variables for theme colors (brand, severity, ink)
- Custom glass-morphism styles (`.glass`, `.glass-input`)
- Animation definitions (fade, slide, pulse)

## API Routes

### POST /api/conflicts/check

**Purpose:** Proxy the conflict check to the Python HDI API.

**Runtime:** Node.js (not Edge) to reach localhost services.

**Request:**
```json
{
  "western_medicines": ["warfarin"],
  "eastern_medicines": ["danshen"]
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "conflicts": [
    {
      "western_drug": "warfarin",
      "tcm_herb": "danshen",
      "severity": "major",
      "mechanism": "Additive anticoagulant effect…"
    }
  ]
}
```

**Error responses:**
- `400` — Invalid JSON or schema validation failure
- `502` — Engine unreachable or timeout (8s)
- `500` — Unexpected server error

**Implementation notes:**
- Validates body with `checkRequestSchema` (see lib/validation.ts)
- Calls `lib/engine.checkConflicts()` to reach the Python API
- Converts `EngineUnavailableError` to 502 with user-facing message

### GET /api/engine/health

**Purpose:** Liveness probe so the UI can display connection status.

**Response (200 OK):**
```json
{
  "connected": true
}
```

**Implementation notes:**
- Calls `lib/engine.engineHealthy()` which pings `/health` on the Python API
- Returns false if the engine is unreachable or non-OK status
- UI shows "Engine online" (green dot) or "Engine offline" (red dot)

## Component Usage

This file imports from `../components/`:
- `GlassCard` — Container with glassmorphism effect
- `Button` — Primary/secondary action button
- `MedListInput` — Chip input for medicine lists
- `FileAttach` — File upload UI (future: OCR integration)
- `ConflictCard` — Display one detected interaction
- `LoadingState`, `EmptyState`, `ErrorState` — Status displays
- `SeverityBadge` — Color-coded severity indicator

See `../components/README.md` for each component's props and behavior.

## API Client Usage

This file imports from `../lib/api-client`:
- `checkConflicts(req)` — POST to /api/conflicts/check, returns ConflictDetail[]
- `getEngineHealth()` — GET /api/engine/health, returns boolean
- `ApiError` — Error class for user-facing error messages

The UI never calls `fetch()` directly — all data access goes through `api-client.ts`. This keeps the data seam in one place so future endpoints (OCR, extraction, patient profiles) only require changes to that one file.

## Styling

**Design system:**
- **Colors:** Brand (blue), severity (red/orange/yellow/green), ink (grayscale)
- **Typography:** System font stack, responsive sizing
- **Spacing:** Tailwind scale (0.25rem increments)
- **Components:** Glass cards with backdrop blur, smooth animations via Framer Motion

**Responsive breakpoints:**
- Mobile: < 640px
- Tablet: 640px+
- Desktop: 1024px+ (max-width 2xl = 42rem content)

## Animations

Uses **Framer Motion** for:
- Step transitions (fade + slide)
- Conflict card stagger animation
- Chip entry/exit animations (MedListInput)
- Engine status indicator pulse

## Environment Variables

None required for the app. The engine URL is configured server-side in `lib/engine.ts` (defaults to `http://127.0.0.1:8000`). For production, set `ENGINE_URL` in the deployment environment.

## Future Additions

### File Upload + OCR (Phase 2)
- `FileAttach` will accept PDFs / images
- Server endpoint to call Gemini vision API
- Results feed back to MedListInput

### Patient Profiles (Phase 3)
- `/patients` page — list of patients
- `/patients/[id]` page — patient detail, medicine history
- POST /api/patients/:id/medicines — persist intake results

### Audit Log UI (Phase 4)
- `/audit` page — view interaction flags and history
- Connection to tamper-evident backend log

## Development

```bash
# Run dev server (auto-reload on file changes)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint TypeScript and CSS
npm run lint
```

Requires the Python HDI API to be running on `http://127.0.0.1:8000` (see `../hdi-api/README.md`).
