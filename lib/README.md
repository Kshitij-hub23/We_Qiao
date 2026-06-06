# lib/ — Utilities & Data Access

Shared utilities, types, and API client code for the Qiáo application.

## Principle: Single Data Seam

**All network data access in the UI goes through `api-client.ts`.** Components never call `fetch()` directly — that keeps the integration point isolated. (Conflict checks and OCR/standardize go through it; the portal layer below — auth, profile, caregivers, records — is `localStorage`-backed and called directly by its own modules.)

---

## api-client.ts

**Purpose:** Browser-facing API client. The ONLY place the UI imports data functions.

**Exports:**

### `checkConflicts(req: CheckRequest): Promise<ConflictDetail[]>`

Sends Western + TCM medicine lists to the server and gets back detected conflicts.

**Signature:**
```typescript
async function checkConflicts(req: CheckRequest): Promise<ConflictDetail[]>
```

**Parameter:**
```typescript
{
  western_medicines: string[]   // e.g., ["warfarin", "aspirin"]
  eastern_medicines: string[]   // e.g., ["danshen", "ginkgo"]
}
```

**Returns:**
```typescript
[
  {
    western_drug: "warfarin",
    tcm_herb: "danshen",
    severity: "major",
    mechanism: "Additive anticoagulant effect…"
  }
]
```

**Error handling:**
- Throws `ApiError` (extends `Error`) with user-facing message
- Messages: "Could not reach the app server", "The server returned an unexpected response", or the backend's error message
- Catch with `catch (err) { if (err instanceof ApiError) { setError(err.message); } }`

**Implementation:**
- POSTs to `/api/conflicts/check` (Next.js route)
- Browser-side error handling only; server errors are translated to user messages

**Example:**
```typescript
try {
  const conflicts = await checkConflicts({
    western_medicines: ["warfarin"],
    eastern_medicines: ["danshen"]
  });
  setConflicts(conflicts);
} catch (err) {
  if (err instanceof ApiError) {
    setError(err.message);
  }
}
```

---

### `getEngineHealth(): Promise<boolean>`

Lightweight probe to check if the Python HDI API is reachable.

**Signature:**
```typescript
async function getEngineHealth(): Promise<boolean>
```

**Returns:**
- `true` if engine is healthy
- `false` if unreachable, timeout, or non-200 status

**Implementation:**
- GETs `/api/engine/health` (Next.js route)
- Never throws; always returns boolean
- Used for the connection indicator (green dot = online, red dot = offline)

**Example:**
```typescript
const [engineUp, setEngineUp] = useState<boolean | null>(null);
useEffect(() => {
  getEngineHealth().then(setEngineUp);
}, []);

<EngineStatus engineUp={engineUp} />
```

---

### `class ApiError extends Error`

Custom error class for API failures.

**Usage:**
```typescript
throw new ApiError("Could not reach the server");
```

**Catch:**
```typescript
} catch (err) {
  if (err instanceof ApiError) {
    setError(err.message);  // User-facing message
  }
}
```

---

## engine.ts

**Purpose:** Server-side wrapper around the Python HDI API. Used by Next.js route handlers, never imported in the browser.

**Key detail:** This is where the engine base URL lives (`http://127.0.0.1:8000` locally), so the browser never knows about the backend service.

**Exports:**

### `checkConflicts(req: CheckRequest): Promise<ConflictDetail[]>`

Server-side conflict check. Forwards to the Python API.

**Signature:**
```typescript
async function checkConflicts(req: CheckRequest): Promise<ConflictDetail[]>
```

**Throws:**
- `EngineUnavailableError` — if the engine is unreachable, times out, or returns non-200 status

**Implementation:**
- 8-second timeout (configurable via `TIMEOUT_MS`)
- Uses `AbortController` for true timeout cancellation
- Case-insensitive name matching on the engine side
- Returns `[]` on any error (caught by route handler)

**Example (in route handler):**
```typescript
try {
  const conflicts = await checkConflicts(req);
  return NextResponse.json({ ok: true, conflicts });
} catch (err) {
  if (err instanceof EngineUnavailableError) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
  }
}
```

---

### `engineHealthy(): Promise<boolean>`

Probe the Python API's `/health` endpoint.

**Signature:**
```typescript
async function engineHealthy(): Promise<boolean>
```

**Returns:**
- `true` if `/health` returns 200 OK with `{"status": "ok"}`
- `false` otherwise (unreachable, timeout, bad status, bad response)

**Implementation:**
- Never throws; always returns boolean
- 8-second timeout
- Used by `/api/engine/health` route

**Example (in route handler):**
```typescript
const connected = await engineHealthy();
return NextResponse.json({ connected });
```

---

### `class EngineUnavailableError extends Error`

Raised when the Python API is unreachable or returns an error.

**Message examples:**
- "The conflict engine timed out at http://127.0.0.1:8000."
- "The conflict engine could not be reached at http://127.0.0.1:8000."
- "The conflict engine responded with HTTP 500."

**Catch (in route handlers):**
```typescript
} catch (err) {
  if (err instanceof EngineUnavailableError) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
  }
}
```

---

## types.ts

**Purpose:** TypeScript interfaces shared between the browser, Next.js routes, and the Python HDI API.

**These types are the source of truth for the integration contract.**

**Exports:**

### `type Severity`

Interaction severity levels.

```typescript
type Severity = "contraindicated" | "major" | "moderate" | "minor"
```

---

### `interface CheckRequest`

Request body sent to conflict-check endpoint.

```typescript
interface CheckRequest {
  western_medicines: string[]    // e.g., ["warfarin", "aspirin"]
  eastern_medicines: string[]    // e.g., ["danshen", "ginkgo"]
}
```

**Matches the Python API exactly** (`hdi-api/models.py: InteractionRequest`).

---

### `interface ConflictDetail`

A single detected interaction (one row from the engine).

```typescript
interface ConflictDetail {
  western_drug: string      // e.g., "warfarin"
  tcm_herb: string          // e.g., "danshen"
  severity: Severity        // one of the four levels
  mechanism: string         // explanation of the interaction
}
```

**Matches the Python API exactly** (`hdi-api/models.py: ConflictDetail`). Returned as-is from the database; no field mapping.

---

### `type CheckResult`

Response body from `/api/conflicts/check` route.

```typescript
type CheckResult =
  | { ok: true; conflicts: ConflictDetail[] }
  | { ok: false; error: string }
```

**Success case:** `{ ok: true, conflicts: [...] }`
**Error case:** `{ ok: false, error: "user-facing message" }`

---

## validation.ts

**Purpose:** Zod schemas for runtime validation. Used in Next.js route handlers to ensure requests are valid before forwarding to the engine.

**Exports:**

### `checkRequestSchema`

Validates the request body for `/api/conflicts/check`.

```typescript
const checkRequestSchema = z.object({
  western_medicines: z.array(z.string()).default([]).transform(...),
  eastern_medicines: z.array(z.string()).default([]).transform(...)
});
```

**Behavior:**
- Accepts `western_medicines` and `eastern_medicines` arrays
- Defaults to `[]` if missing
- **Trims whitespace** from each item
- **Filters out empty strings** after trimming
- **Type-safe:** infer with `z.infer<typeof checkRequestSchema>`

**Example (in route handler):**
```typescript
const parsed = checkRequestSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ ok: false, error: "Invalid request shape." }, { status: 400 });
}
// parsed.data is now typed as CheckRequest
const conflicts = await checkConflicts(parsed.data);
```

---

### `type ParsedCheckRequest`

The inferred type from `checkRequestSchema`.

```typescript
type ParsedCheckRequest = z.infer<typeof checkRequestSchema>
```

**Use case:** Type-safe route handler parameters.

---

## intake.ts (OCR + standardize)

**Purpose:** Server-side wrapper around the Python **intake service** (`standardizer/`, port 8001) —
the fuzzy step. Used by Next.js route handlers only; the browser never talks to Gemini directly.

**Exports:**
- `ocrImage(bytes, mimeType): Promise<string>` — POSTs an uploaded image to `${INTAKE_URL}/api/v1/ocr`,
  returns the transcribed prescription text. ~45s timeout (vision calls are slow).
- `standardizeText(text): Promise<StandardizedMedicines>` — POSTs confirmed text to
  `${INTAKE_URL}/api/v1/standardize`, returns `{ western_medicines, eastern_medicines }` (canonical,
  DB-matched names).
- `class IntakeUnavailableError extends Error` — thrown when the intake service is unreachable, times
  out, or errors (route handlers map it to HTTP 502).

The browser reaches these via `app/api/ocr` and `app/api/standardize`, and the client-side wrappers
`ocrImage`/`standardizeText` in `api-client.ts`.

---

## Portal layer (demo-grade, client-side)

These power the patient portal. **All state lives in `localStorage`** — there is no server. Each
module is a drop-in seam: swap the storage calls for real API calls later without touching components.

- **`auth.ts`** — demo auth. `login(email, password)` checks `DEMO_USERS` then patient-created
  caregiver accounts; `getSession()` / `logout()` manage a `localStorage` session. Exports the
  `SessionUser` shape (id, email, name, role, initials, avatarHex, optional `linkedPatientId` for
  caregivers) and `Role = "patient" | "caretaker" | "practitioner" | "caregiver"`.
- **`demo-users.ts`** — seeded demo accounts (Eleanor Chen / patient, James Wong / caretaker,
  Dr. Liu Wei / practitioner). Plain-text passwords — **demo only**.
- **`profile.ts`** — the full `PatientProfile` (immutable system **Patient ID** `PAT-2026-NNNNNN`,
  demographics, emergency contact, insurance, registration date). `getProfile()` seeds/loads,
  `updateProfile()` saves editable fields (Patient ID + registration date are never editable).
- **`caregivers.ts`** — per-patient caregiver list with permission flags (`profile`, `prescriptions`,
  `medications`, `history`). `addCaregiver()` generates a one-time credential and registers a login
  account; `findCaregiverAccount()` backs caregiver sign-in; plus `updateCaregiverPermissions()` /
  `removeCaregiver()`.
- **`user-records.ts`** — per-user clinical lists keyed by `RecordKind`
  (`diseases | western | eastern | allergies | treatment`). `getItems` / `addItem` (de-dupes) /
  `removeItem` / `seedIfEmpty`.
- **`i18n.tsx`** — bilingual EN / 繁體中文. `LanguageProvider` + `useT()` (UI strings) and `useTerm()` /
  `localizeTerm()` (a clinical-term glossary that translates stored names for **display only** — stored
  values stay canonical English so the engine lookup and delete-by-value keep working). Choice persists
  in `localStorage`.

---

## Data Flow Summary

```
Browser (page.tsx)
    │
    ├─→ calls checkConflicts() [api-client.ts]
    │
    ├─→ POSTs to /api/conflicts/check [app/api/conflicts/check/route.ts]
    │
    ├─→ validates with checkRequestSchema [validation.ts]
    │
    ├─→ calls checkConflicts() [engine.ts]
    │
    ├─→ POSTs to http://127.0.0.1:8000/api/v1/check-conflicts [Python HDI API]
    │
    └─→ returns ConflictDetail[] [types.ts]
```

---

## Environment Variables

### `ENGINE_URL` (optional)

URL of the Python HDI API. Defaults to `http://127.0.0.1:8000`.

**Set in production:**
```bash
# For Vercel deployment
vercel env add ENGINE_URL https://my-hdi-api.railway.app
```

### `INTAKE_URL` (optional)

URL of the Python intake service (OCR + standardize). Defaults to `http://127.0.0.1:8001`.
Read in `lib/intake.ts`. Set in production the same way as `ENGINE_URL`.

```typescript
const ENGINE_URL = process.env.ENGINE_URL ?? "http://127.0.0.1:8000";  // lib/engine.ts
const INTAKE_URL = process.env.INTAKE_URL ?? "http://127.0.0.1:8001";  // lib/intake.ts
```

---

## Future / not yet built

OCR + standardize and the patient profile are now **implemented** (see `intake.ts` and the portal
layer above). Still deferred: a **server database + real auth** (today everything is `localStorage`),
a PDF "passport" export, and a tamper-evident audit log. When those land, keep the same seam pattern —
add functions to `api-client.ts` (and `types.ts` if shapes change); components stay untouched.
