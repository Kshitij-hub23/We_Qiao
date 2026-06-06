# API Documentation

Complete reference for all Qiáo API endpoints (Next.js app + Python HDI API).

---

## Next.js API Routes

The browser talks to these endpoints. They proxy requests to the Python HDI API.

### POST /api/conflicts/check

Check for drug-herb interactions between Western medicines and TCM herbs.

**Request:**

```json
{
  "western_medicines": ["warfarin", "aspirin"],
  "eastern_medicines": ["danshen", "ginkgo"]
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
      "mechanism": "Additive anticoagulant effect — increased bleeding risk."
    }
  ]
}
```

**Error Response (400 Bad Request):**

```json
{
  "ok": false,
  "error": "Invalid request shape."
}
```

**Error Response (502 Bad Gateway):**

```json
{
  "ok": false,
  "error": "The conflict engine timed out at http://127.0.0.1:8000."
}
```

**Status Codes:**
- `200` — Success; conflicts returned (may be empty list)
- `400` — Invalid JSON or schema validation failure
- `500` — Server error (unexpected exception)
- `502` — Engine unreachable, timeout, or returned bad status

**Parameters:**

| Name | Type | Required | Notes |
|------|------|----------|-------|
| `western_medicines` | string[] | No | WM drug names; defaults to `[]` if omitted |
| `eastern_medicines` | string[] | No | TCM herb/formula names; defaults to `[]` if omitted |

**Validation:**
- Arrays of strings only
- Whitespace is trimmed from each item
- Empty strings are filtered out
- No duplicates enforced by API (OK to send duplicates; they're de-duplicated in the response)

**Implementation:**
- Runtime: Node.js (not Edge) to reach localhost services
- Calls `lib/engine.checkConflicts()`
- Timeout: 8 seconds

**Browser example:**
```typescript
import { checkConflicts } from "@/lib/api-client";

try {
  const conflicts = await checkConflicts({
    western_medicines: ["warfarin"],
    eastern_medicines: ["danshen"]
  });
  console.log(conflicts);  // Array of ConflictDetail
} catch (err) {
  console.error(err instanceof ApiError ? err.message : "Unknown error");
}
```

**cURL example:**
```bash
curl -X POST http://localhost:3000/api/conflicts/check \
  -H "Content-Type: application/json" \
  -d '{
    "western_medicines": ["warfarin"],
    "eastern_medicines": ["danshen"]
  }'
```

---

### GET /api/engine/health

Probe the Python HDI API to check if it's reachable.

**Response (200 OK):**

```json
{
  "connected": true
}
```

**Response (200 OK, engine offline):**

```json
{
  "connected": false
}
```

**Status Codes:**
- `200` — Always returns 200 (never errors); check the `connected` field

**Implementation:**
- Calls `lib/engine.engineHealthy()`
- Timeout: 8 seconds
- Never throws; always returns a boolean wrapped in JSON

**Browser example:**
```typescript
import { getEngineHealth } from "@/lib/api-client";

const connected = await getEngineHealth();
if (connected) {
  console.log("Engine is online");
} else {
  console.log("Engine is offline");
}
```

**UI usage:**
- Connection indicator at top-right of page
- Green dot = online
- Red dot = offline
- Yellow spinner = checking

---

## Python HDI API Routes

The deterministic conflict-detection service. Queried by Next.js; never called directly by the browser.

Base URL: `http://127.0.0.1:8000` (local development) or `$ENGINE_URL` (production)

Interactive docs: `http://127.0.0.1:8000/docs` (Swagger UI)

---

### POST /api/v1/check-conflicts

Return every known interaction between the supplied WM and TCM agents.

**Request:**

```json
{
  "western_medicines": ["warfarin", "aspirin"],
  "eastern_medicines": ["danshen", "ginkgo"]
}
```

**Response (200 OK):**

```json
[
  {
    "western_drug": "warfarin",
    "tcm_herb": "danshen",
    "severity": "major",
    "mechanism": "Additive anticoagulant effect — increased bleeding risk."
  },
  {
    "western_drug": "warfarin",
    "tcm_herb": "ginkgo",
    "severity": "moderate",
    "mechanism": "Enhanced anticoagulant activity — may increase bleeding tendency."
  }
]
```

**Response (200 OK, no conflicts):**

```json
[]
```

**Status Codes:**
- `200` — Success; conflicts array returned (may be empty)
- `422` — Validation error (field name typo, wrong type)

**Parameters:**

| Name | Type | Required | Notes |
|------|------|----------|-------|
| `western_medicines` | string[] | No | WM drug names; defaults to `[]` |
| `eastern_medicines` | string[] | No | TCM herb/formula names; defaults to `[]` |

**Behavior:**
- Case-insensitive matching (stored as-is; matched via `LOWER()` SQL function)
- Returns every row where `western_drug` IN `western_medicines` AND `tcm_herb` IN `eastern_medicines`
- Empty arrays short-circuit; returns `[]` without querying the database
- Never de-duplicates rows (if two rows match, both are returned)

**Database schema:**

```
Table: interactions
┌─────────────────┬─────────────┬──────────────┐
│ Column          │ Type        │ Indexed      │
├─────────────────┼─────────────┼──────────────┤
│ id              │ Integer PK  │ Yes          │
│ western_drug    │ String      │ Yes (index)  │
│ tcm_herb        │ String      │ Yes (index)  │
│ interaction_type│ String      │ No           │
│ severity        │ String      │ No           │
│ mechanism       │ Text        │ No           │
└─────────────────┴─────────────┴──────────────┘
```

**Example query:**
```sql
SELECT * FROM interactions
WHERE LOWER(western_drug) IN ('warfarin', 'aspirin')
  AND LOWER(tcm_herb) IN ('danshen', 'ginkgo');
```

**Server example (Python):**
```python
import requests

response = requests.post(
    "http://127.0.0.1:8000/api/v1/check-conflicts",
    json={
        "western_medicines": ["warfarin"],
        "eastern_medicines": ["danshen"]
    }
)
print(response.json())  # List of conflicts
```

**cURL example:**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/check-conflicts \
  -H "Content-Type: application/json" \
  -d '{
    "western_medicines": ["warfarin"],
    "eastern_medicines": ["danshen"]
  }'
```

---

### GET /health

Liveness probe for the Python API.

**Response (200 OK):**

```json
{
  "status": "ok"
}
```

**Status Codes:**
- `200` — API is up and ready to accept requests

**Implementation:**
- No database queries
- Responds immediately
- Used by Next.js `/api/engine/health` endpoint

**cURL example:**
```bash
curl http://127.0.0.1:8000/health
```

---

## Data Types & Schemas

### ConflictDetail

A single detected interaction.

```typescript
interface ConflictDetail {
  western_drug: string       // WM drug name (e.g., "Warfarin")
  tcm_herb: string           // TCM herb/formula name (e.g., "Danshen")
  severity: Severity         // One of: "contraindicated", "major", "moderate", "minor"
  mechanism: string          // Clinical explanation of the interaction
}
```

**Severity levels (in order of risk):**
1. `contraindicated` — Avoid this combination; high risk of serious harm
2. `major` — Significant interaction; requires medical supervision
3. `moderate` — Noticeable interaction; may require dose adjustment
4. `minor` — Small interaction; usually not clinically significant

**Example:**
```json
{
  "western_drug": "Warfarin",
  "tcm_herb": "Danshen",
  "severity": "major",
  "mechanism": "Danshen has antiplatelet activity. Combined with warfarin's anticoagulant effect, this significantly increases bleeding risk. Monitor INR closely if co-administration is necessary."
}
```

### CheckRequest

Request body for conflict check.

```typescript
interface CheckRequest {
  western_medicines: string[]    // Array of WM drug names
  eastern_medicines: string[]    // Array of TCM herb/formula names
}
```

**Validation rules:**
- Both fields are required in the schema
- Both default to `[]` if omitted
- Array items must be strings
- Whitespace is trimmed from each item
- Empty strings are filtered out

**Example:**
```json
{
  "western_medicines": ["warfarin", "aspirin"],
  "eastern_medicines": ["danshen"]
}
```

### Severity

Severity level of an interaction.

```typescript
type Severity = "contraindicated" | "major" | "moderate" | "minor"
```

**Ranking (by risk):**
```typescript
const SEVERITY_RANK = {
  "contraindicated": 0,
  "major": 1,
  "moderate": 2,
  "minor": 3,
};
```

Used by the UI to sort conflicts (most severe first).

---

## Error Responses

### 400 Bad Request (Next.js)

Invalid JSON or schema validation failure.

```json
{
  "ok": false,
  "error": "Invalid request shape."
}
```

**Reasons:**
- Missing required fields
- Wrong field names (typo)
- Wrong data types (e.g., string instead of array)
- JSON parse error

---

### 422 Unprocessable Entity (Python API)

Pydantic validation failed.

```json
{
  "detail": [
    {
      "type": "list_type",
      "loc": ["body", "western_medicines"],
      "msg": "Input should be a valid list",
      "input": "not an array"
    }
  ]
}
```

**Reasons:**
- Field is not an array
- Array items are not strings
- Required field is missing

---

### 502 Bad Gateway (Next.js)

Engine unreachable, timeout, or returned non-200 status.

```json
{
  "ok": false,
  "error": "The conflict engine timed out at http://127.0.0.1:8000."
}
```

**Possible error messages:**
- "The conflict engine timed out at http://127.0.0.1:8000."
- "The conflict engine could not be reached at http://127.0.0.1:8000."
- "The conflict engine responded with HTTP 500."

**Reasons:**
- Python API server is not running
- Network connectivity issue
- Engine is slow (> 8 second timeout)
- Python API crashes or returns non-200 status

---

### 500 Internal Server Error (Next.js)

Unexpected server error.

```json
{
  "ok": false,
  "error": "Unexpected error contacting the conflict engine."
}
```

**Reasons:**
- Unhandled exception in the route handler
- Engine returned unexpected response format

---

## Testing the API

### Using Swagger UI

```
http://127.0.0.1:8000/docs
```

Open in browser. Click on the endpoint, enter parameters, and click "Try it out".

### Using cURL

**Test the Python API directly:**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/check-conflicts \
  -H "Content-Type: application/json" \
  -d '{
    "western_medicines": ["warfarin"],
    "eastern_medicines": ["danshen"]
  }'
```

**Test the Next.js proxy:**
```bash
curl -X POST http://localhost:3000/api/conflicts/check \
  -H "Content-Type: application/json" \
  -d '{
    "western_medicines": ["warfarin"],
    "eastern_medicines": ["danshen"]
  }'
```

**Test the health probe:**
```bash
curl http://127.0.0.1:8000/health
curl http://localhost:3000/api/engine/health
```

### Using Postman

Import the following:

**Base URL (dev):** `http://localhost:3000`

**Collection:**
```json
{
  "info": {
    "name": "Qiáo API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Check Conflicts",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"western_medicines\": [\"warfarin\"], \"eastern_medicines\": [\"danshen\"]}"
        },
        "url": {
          "raw": "http://localhost:3000/api/conflicts/check",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "conflicts", "check"]
        }
      }
    },
    {
      "name": "Engine Health",
      "request": {
        "method": "GET",
        "url": {
          "raw": "http://localhost:3000/api/engine/health",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "engine", "health"]
        }
      }
    }
  ]
}
```

---

## Future Endpoints

### Phase 2 — Extraction

```
POST /api/extraction/upload-pdf
POST /api/extraction/extract-text
```

Takes free-text or PDF input, uses Gemini to standardize, returns CheckRequest.

### Phase 3 — Patient Profiles

```
POST /api/patients/:id/medicines
GET /api/patients/:id/medicines
GET /api/patients/:id/history
```

Persist intake results, compare with historical records.

### Phase 4 — Audit Log

```
POST /api/audit/flag-interaction
GET /api/audit/logs
```

Tamper-evident record of who checked, when, and what the results were.
