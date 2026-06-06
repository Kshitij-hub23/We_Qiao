# HDI API Response Format

## Overview

The HDI API endpoint `/api/v1/check-conflicts` returns a **JSON array** of conflict objects.

---

## Response Structure

### Success Response (200 OK)

**Format:** `List[ConflictDetail]`

```json
[
  {
    "western_drug": "string",
    "tcm_herb": "string",
    "severity": "string",
    "mechanism": "string"
  },
  ...
]
```

### Field Definitions

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `western_drug` | string | `"Warfarin"` | Canonical WM drug name (preferred_name from entities table) |
| `tcm_herb` | string | `"Danshen"` | Canonical TCM herb/formula name (preferred_name from entities table) |
| `severity` | string | `"major"` | One of: `"contraindicated"` \| `"major"` \| `"moderate"` \| `"minor"` |
| `mechanism` | string | `"Additive anticoagulant effect — increased bleeding risk."` | Clinical explanation of the interaction |

---

## Example Responses

### Hero Flow: Warfarin + Danshen

**Request:**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/check-conflicts \
  -H "Content-Type: application/json" \
  -d '{"western_medicines": ["warfarin"], "eastern_medicines": ["danshen"]}'
```

**Response (200 OK):**
```json
[
  {
    "western_drug": "Warfarin",
    "tcm_herb": "Danshen",
    "severity": "major",
    "mechanism": "Additive anticoagulant effect — increased bleeding risk."
  }
]
```

---

### No Conflicts Found

**Request:**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/check-conflicts \
  -H "Content-Type: application/json" \
  -d '{"western_medicines": ["aspirin"], "eastern_medicines": ["garlic"]}'
```

**Response (200 OK):**
```json
[]
```

---

### Multiple Conflicts

**Request:**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/check-conflicts \
  -H "Content-Type: application/json" \
  -d '{"western_medicines": ["warfarin", "aspirin"], "eastern_medicines": ["danshen", "ginkgo"]}'
```

**Response (200 OK):**
```json
[
  {
    "western_drug": "Warfarin",
    "tcm_herb": "Danshen",
    "severity": "major",
    "mechanism": "Additive anticoagulant effect — increased bleeding risk."
  },
  {
    "western_drug": "Warfarin",
    "tcm_herb": "Ginkgo",
    "severity": "moderate",
    "mechanism": "Enhanced anticoagulant activity — may increase bleeding tendency."
  },
  {
    "western_drug": "Aspirin",
    "tcm_herb": "Danshen",
    "severity": "moderate",
    "mechanism": "Danshen constituents add to aspirin's platelet inhibition..."
  }
]
```

---

### Empty Input (Immediate Short-Circuit)

**Request:**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/check-conflicts \
  -H "Content-Type: application/json" \
  -d '{"western_medicines": [], "eastern_medicines": ["danshen"]}'
```

**Response (200 OK):**
```json
[]
```

(No lookup is performed; returns immediately.)

---

### Unknown Medicine (Silently Dropped)

**Request:**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/check-conflicts \
  -H "Content-Type: application/json" \
  -d '{"western_medicines": ["unknown_drug_xyz"], "eastern_medicines": ["danshen"]}'
```

**Response (200 OK):**
```json
[]
```

(The unknown drug doesn't resolve to any entity, so no matches are found.)

---

## Error Responses

### 400 Bad Request

Invalid JSON or schema validation failure.

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

### 422 Unprocessable Entity

Pydantic validation failed (wrong field names, wrong types).

```json
{
  "detail": [
    {
      "type": "extra_forbidden",
      "loc": ["body", "unknown_field"],
      "msg": "Extra inputs are not permitted",
      "input": "value"
    }
  ]
}
```

---

## Implementation Details

### How the Response is Built

The response is built in `main.py` line 112-123:

```python
results: List[ConflictDetail] = []
for r in rows:
    a, b = entities[r.agent_a_id], entities[r.agent_b_id]
    wm, tcm = (a, b) if a.type == "WM-drug" else (b, a)
    results.append(
        ConflictDetail(
            western_drug=wm.preferred_name,     # From Entity.preferred_name
            tcm_herb=tcm.preferred_name,        # From Entity.preferred_name
            severity=r.severity,                # From Interaction.severity
            mechanism=r.mechanism,              # From Interaction.mechanism
        )
    )
```

### Key Points

1. **Response is always a JSON array** — even if empty `[]`
2. **Names are canonical** — always `preferred_name` from the entities table, not the user's input
3. **Case-exact spelling** — e.g., "Warfarin" not "warfarin"
4. **Only 4 fields returned** — other interaction data (clinical_effect, management, evidence_level, sources) are stored in DB but not surfaced yet
5. **Only TCM-WM interactions** — WM-WM and TCM-TCM are stored but not returned by this endpoint
6. **Sorted by insertion order** — not sorted by severity (frontend does the sorting)

---

## Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | Success | Always (even if `[]` is returned) |
| 400 | Bad Request | Invalid JSON, missing required fields |
| 422 | Unprocessable Entity | Schema validation failed (wrong field names, types) |
| 500 | Internal Server Error | Database error or unhandled exception |

---

## Design Notes

- **HTTP 200 for empty results** — No conflicts found is not an error; it's a valid result (`[]`)
- **No error messages** — If a medicine is unknown, it's silently dropped (not an error)
- **Flat response** — No nested objects; each conflict is a simple 4-field object
- **Pydantic model** — `from_attributes=True` allows direct SQLAlchemy → JSON conversion
- **No pagination** — Expected dataset is small (51 interactions); all results returned at once

