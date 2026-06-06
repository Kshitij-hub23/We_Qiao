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
- Matching is **case-insensitive** and **alias-aware**: each name is resolved against the entity alias
  index, so a brand name (`"Coumadin"`), pinyin (`"danggui"`), latin (`"Salvia miltiorrhiza"`), or
  Chinese (`"丹参"`) name all resolve to the right entity.
- Each item in the response represents a detected interaction between one WM drug and one TCM herb.
- A **TCM-WM** row is returned only when one of its agents resolves from `western_medicines` **AND** the
  other resolves from `eastern_medicines`. (WM-WM and TCM-TCM rows are stored but not surfaced by this
  endpoint yet.)
- Response `western_drug` / `tcm_herb` are the dataset's canonical `preferred_name`s, not the strings you
  sent.

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

The DB mirrors the normalized dataset in [`Medicine_data/`](Medicine_data/): entities are stored once
with a stable `entity_id`, interactions reference two entity IDs, and an alias table indexes every name
form for matching. Three tables (auto-created empty on startup):

**`entities`** — one row per drug/herb/formula (from `entities.json`):

| Column | Type | Notes |
| --- | --- | --- |
| `entity_id` | String (PK) | e.g. `"E-0001"`. |
| `preferred_name` | String | Canonical display name (`"Warfarin"`, `"Danshen"`). |
| `type` | String | `"WM-drug"` \| `"TCM-herb"` \| `"TCM-formula"`. |
| `drug_class`, `rxnorm_id` | String | WM only. |
| `latin`, `pinyin`, `chinese` | String | TCM only. |
| `common_names`, `active_constituents` | Text | JSON arrays. |

**`entity_aliases`** — every lowercased name form → `entity_id` (preferred name, latin, pinyin, chinese,
each common name, plus `/`-split and parenthetical-stripped variants). Indexed on `alias`; unique on
`(alias, entity_id)`. This is what makes lookups alias-aware.

**`interactions`** — one row per curated pair (from `interactions.json`), **all three classes**:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer (PK) | Auto-increment. |
| `interaction_id` | String (unique) | e.g. `"INT-0001"`. |
| `agent_a_id`, `agent_b_id` | String (FK → entities) | The two interacting entities (order not significant). |
| `interaction_class` | String | `"TCM-WM"` \| `"WM-WM"` \| `"TCM-TCM"`. The endpoint filters to `TCM-WM`. |
| `severity` | String | `contraindicated` \| `major` \| `moderate` \| `minor`. |
| `effect_direction`, `evidence_level` | String | From the dataset vocabularies. |
| `mechanism`, `clinical_effect`, `management` | Text | Explainability fields. |
| `sources` | Text | JSON array of `{type, ref, note}`. |

> The current API response surfaces only `severity` + `mechanism` (plus the two names). The remaining
> fields (`clinical_effect`, `management`, `evidence_level`, `sources`) are persisted for later use.

### Populating the database

The tables start **empty**. Populate them from the curated JSON with the ingestion script:

```bash
cd hdi-api
python seed.py
```

`seed.py` reads `Medicine_data/entities.json` + `interactions.json`, rebuilds all three tables from
scratch (so re-runs are idempotent), validates referential integrity, builds the alias index, and prints
counts per class. Current dataset: **46 entities, 51 interactions** (30 TCM-WM, 12 WM-WM, 9 TCM-TCM).
Re-run it whenever the dataset changes.

### Inspecting the database

```bash
sqlite3 hdi.db

SELECT COUNT(*) FROM interactions;                    -- total rows
SELECT interaction_class, COUNT(*) FROM interactions  -- breakdown per class
  GROUP BY interaction_class;
SELECT entity_id FROM entity_aliases                  -- resolve a free-text name
  WHERE alias = 'coumadin';
```

### Resetting the database

`seed.py` drops and recreates the tables every run, so just re-run it. To wipe entirely, stop the server
and delete `hdi.db` (recreated empty on next startup, repopulated by `seed.py`).

---

## Architecture

### Deployment model

- **Database:** Local SQLite file (`hdi.db`) in the working directory.
- **Threading:** Multi-threaded with `check_same_thread=False` (required for FastAPI + SQLite).
- **Sessions:** Each request gets its own scoped session, closed after the response.
- **Migrations:** None — schema is recreated from the SQLAlchemy ORM models. If you change `database.py`, re-run `python seed.py` to rebuild, or introduce a migration tool (e.g., Alembic) for production.

### How the conflict-check query works

1. Inbound names are trimmed and lowercased; empty lists short-circuit to `[]`.
2. All names are resolved to `entity_id`s in one query against `entity_aliases` → a Western id-set and an
   Eastern id-set. If either is empty (nothing recognized), return `[]`.
3. `TCM-WM` interactions are selected where the two agents straddle the sets — matching **either**
   orientation, since the WM drug may be stored as `agent_a` or `agent_b`:

   ```python
   db.query(Interaction).filter(
       Interaction.interaction_class == "TCM-WM",
       or_(
           and_(Interaction.agent_a_id.in_(western_ids), Interaction.agent_b_id.in_(eastern_ids)),
           and_(Interaction.agent_b_id.in_(western_ids), Interaction.agent_a_id.in_(eastern_ids)),
       ),
   ).all()
   ```
4. For each row, the agent typed `WM-drug` becomes `western_drug` and the TCM agent becomes `tcm_herb`
   (by `preferred_name`), producing the `ConflictDetail` response.

### Interaction between API response and database schema

The `interactions` table is class-agnostic (`agent_a_id` / `agent_b_id`), so the endpoint maps each
matched row to the flat `ConflictDetail` shape rather than serializing a row directly:

```python
# models.py (API response — unchanged public contract)
class ConflictDetail(BaseModel):
    western_drug: str   # preferred_name of the WM-drug agent
    tcm_herb: str       # preferred_name of the TCM agent
    severity: str
    mechanism: str
```

Keeping the response shape fixed means the schema can grow (more fields, more classes) without breaking
the frontend.

---

## File layout

| File               | Responsibility |
| ------------------ | --------------- |
| `main.py`          | FastAPI app, health probe, `/api/v1/check-conflicts` endpoint (alias resolution + TCM-WM match). |
| `models.py`        | Pydantic schemas: `InteractionRequest` (request) and `ConflictDetail` (response). |
| `database.py`      | SQLAlchemy engine + `Entity`, `EntityAlias`, `Interaction` ORM models, table creation, sessions. |
| `seed.py`          | Ingestion: loads `Medicine_data/*.json` into the DB and builds the alias index. |
| `Medicine_data/`   | The curated, sourced dataset (`entities.json`, `interactions.json`, `SOURCES.md`, etc.). |
| `requirements.txt` | Dependencies: `fastapi`, `uvicorn[standard]`, `sqlalchemy`. |

---

## Dataset contract

The DB now consumes the curated dataset in [`Medicine_data/`](Medicine_data/) directly — the rich
`entities.json` / `interactions.json` keyed by `entity_id` (with `rxnorm_id`, `evidence_level`,
`sources[]`, etc.) described in the root [`CLAUDE.md`](../CLAUDE.md). `seed.py` is the mapping layer:

1. Loads entities, persisting all name forms into `entity_aliases` for resolution.
2. Loads interactions by entity ID, preserving `interaction_class` so all three classes are stored.
3. Validates referential integrity (every `agent_*_id` exists) and fails loudly on drift.

When the dataset changes, drop in the new JSON and re-run `python seed.py`. To extend coverage to WM-WM
or TCM-TCM, surface those classes in `main.py` (the data is already loaded) — likely via a new endpoint
or a class filter, keeping the TCM-WM contract intact.
