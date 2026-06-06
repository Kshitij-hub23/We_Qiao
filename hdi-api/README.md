# Qiáo HDI API

A deterministic **Herb-Drug Interaction (HDI)** conflict-detection service. Given a patient's Western Medicine (WM) and Traditional Chinese Medicine (TCM) medication lists, it queries a curated SQLite database and returns all known interactions. The safety verdict is a **pure database lookup** — never model-generated.

This service is the *deterministic* half of the Qiáo system (see [`../CLAUDE.md`](../CLAUDE.md), principle #2).

---

## 60-second setup

```bash
# 1. Install dependencies
cd hdi-api
pip install -r requirements.txt

# 2. Start the server
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Server is live at **http://127.0.0.1:8000**

- **Interactive API docs:** http://127.0.0.1:8000/docs (open in browser, test requests live)
- **Health check:** http://127.0.0.1:8000/health

---

## Using the API

### Check for conflicts

**POST** `/api/v1/check-conflicts`

**Request:**
```json
{
  "western_medicines": ["warfarin", "aspirin"],
  "eastern_medicines": ["danshen", "ginkgo"]
}
```

**Response:**
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

**Notes:**
- Request lists can be empty; response will be `[]`.
- Matching is **case-insensitive** (`"Warfarin"`, `"WARFARIN"`, `"warfarin"` all match).
- Each item in the response represents a detected interaction between one WM drug and one TCM herb.
- A row is returned only if its `western_drug` matches *any* item in `western_medicines` **AND** its `tcm_herb` matches *any* item in `eastern_medicines`.

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

## Database

### Schema

The `interactions` table (auto-created on startup):

| Column             | Type    | Notes                                                   |
| ------------------ | ------- | ------------------------------------------------------- |
| `id`               | Integer | Auto-incrementing primary key.                          |
| `western_drug`     | String  | WM drug name (e.g., `"Warfarin"`).                      |
| `tcm_herb`         | String  | TCM herb or formula name (e.g., `"Danshen"`).           |
| `interaction_type` | String  | Interaction category (e.g., `"TCM-WM"`). Not returned by API. |
| `severity`         | String  | Severity level: `"contraindicated"`, `"major"`, `"moderate"`, or `"minor"`. |
| `mechanism`        | Text    | Explanation of the mechanism and clinical effect.       |

**Indexes:**
- Individual indexes on `western_drug` and `tcm_herb` for fast lookups.
- Composite index on `(western_drug, tcm_herb)` for combined queries.

### Populating the database

The table starts **empty**. Populate it using a separate ingestion pipeline:

```python
from database import SessionLocal, Interaction, init_db

init_db()  # Ensure table exists
db = SessionLocal()

# Add a single interaction
db.add(Interaction(
    western_drug="Warfarin",
    tcm_herb="Danshen",
    interaction_type="TCM-WM",
    severity="major",
    mechanism="Additive anticoagulant effect — increased bleeding risk.",
))
db.commit()
db.close()
```

**For batch inserts:**
```python
from database import SessionLocal, Interaction, init_db

init_db()
db = SessionLocal()

interactions = [
    Interaction(western_drug="Warfarin", tcm_herb="Danshen", ...),
    Interaction(western_drug="Warfarin", tcm_herb="Ginkgo", ...),
    # ... more rows
]
db.add_all(interactions)
db.commit()
db.close()
```

**Guidelines:**
- Store names in their natural form (e.g., `"Warfarin"`, not `"warfarin"`); the API lowercases at query time.
- Decide on a normalization convention upstream (e.g., one row per directed pair) — the API does not deduplicate.
- Batch inserts and `commit()` once per batch for speed on large datasets.

### Inspecting the database

```bash
# Connect to the database directly
sqlite3 hdi.db

# Count interactions
SELECT COUNT(*) FROM interactions;

# View sample interactions
SELECT * FROM interactions LIMIT 10;

# Search for a specific drug
SELECT * FROM interactions WHERE LOWER(western_drug) = 'warfarin';
```

### Resetting the database

The table is created from scratch on server startup. To reset:

```bash
# Stop the server
# Then delete the database file (it will be recreated empty on next startup)
rm hdi.db
```

---

## Architecture

### Deployment model

- **Database:** Local SQLite file (`hdi.db`) in the working directory.
- **Threading:** Multi-threaded with `check_same_thread=False` (required for FastAPI + SQLite).
- **Sessions:** Each request gets its own scoped session, closed after the response.
- **Migrations:** None — schema is recreated from the SQLAlchemy ORM model. If you change `database.py`, delete `hdi.db` to rebuild, or introduce a migration tool (e.g., Alembic) for production.

### How the conflict-check query works

```python
db.query(Interaction).filter(
    func.lower(Interaction.western_drug).in_(western),
    func.lower(Interaction.tcm_herb).in_(eastern),
).all()
```

1. Inbound drug and herb names are trimmed and lowercased in Python.
2. The SQL compares `LOWER(column)` against both lists using an AND condition.
3. A row matches if its `western_drug` is in the request's `western_medicines` AND its `tcm_herb` is in `eastern_medicines`.
4. If either list is empty after trimming, the endpoint short-circuits and returns `[]` without querying the database.

### Interaction between API response and database schema

The `ConflictDetail` response model is built directly from the `Interaction` ORM model:

```python
# database.py (ORM model)
class Interaction(Base):
    __tablename__ = "interactions"
    id = Column(Integer, primary_key=True)
    western_drug = Column(String, index=True)
    tcm_herb = Column(String, index=True)
    severity = Column(String)
    mechanism = Column(Text)

# models.py (API response)
class ConflictDetail(BaseModel):
    western_drug: str
    tcm_herb: str
    severity: str
    mechanism: str
    model_config = {"from_attributes": True}  # Allows direct ORM → Pydantic conversion
```

This design avoids field-mapping boilerplate — a database row is serialized directly to the response.

---

## File layout

| File               | Responsibility |
| ------------------ | --------------- |
| `main.py`          | FastAPI app, health probe, `/api/v1/check-conflicts` endpoint. |
| `models.py`        | Pydantic schemas: `InteractionRequest` (request) and `ConflictDetail` (response). |
| `database.py`      | SQLAlchemy engine, `Interaction` ORM model, table creation, session management. |
| `requirements.txt` | Dependencies: `fastapi`, `uvicorn[standard]`, `sqlalchemy`. |

---

## Dataset contract

The root [`CLAUDE.md`](../CLAUDE.md) defines a richer dataset contract (`entities.json` / `interactions.json` keyed by `entity_id`, with `rxnorm_id`, `evidence_level`, `sources[]`, etc.). This table uses a **flat string** schema (`western_drug` / `tcm_herb`).

When the real curated dataset lands, add a mapping layer that:
1. Resolves entity IDs to preferred names.
2. Projects the rich records into this table's columns.
3. Flags schema drift early so the two representations stay in sync.
