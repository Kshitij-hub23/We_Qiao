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

### Resolve names to entities

**POST** `/api/v1/resolve` — the deterministic matching step (and the safety
boundary). The LLM extraction step (`../standardizer/`) returns surface candidate
names with no vocabulary; this endpoint maps them to dataset entities so only
known entities reach a conflict check.

**Request:**
```json
{ "candidates": ["Coumadin", "丹參", "danshne", "totally unknown herb"] }
```

**Response:**
```json
{
  "matched": [
    {"candidate": "Coumadin", "entity_id": "E-0101", "preferred_name": "Warfarin",
     "type": "WM-drug", "score": 1.0, "method": "exact", "requires_confirmation": false},
    {"candidate": "丹參", "entity_id": "E-0001", "preferred_name": "Danshen",
     "type": "TCM-herb", "score": 1.0, "method": "exact", "requires_confirmation": false},
    {"candidate": "danshne", "entity_id": "E-0001", "preferred_name": "Danshen",
     "type": "TCM-herb", "score": 0.857, "method": "fuzzy", "requires_confirmation": true}
  ],
  "unmatched": ["totally unknown herb"]
}
```

**How it resolves each candidate** (`resolver.py`):
1. **Normalize** into variant forms — lowercase, trim, tone-stripped pinyin
   (`dānshēn`→`danshen`), and OpenCC simplified⇄traditional (`丹参`⇄`丹參`).
2. **Exact** — any variant that is a key in the alias index resolves immediately
   (`method: "exact"`, score `1.0`).
3. **Fuzzy fallback** — otherwise `rapidfuzz` scores the candidate against the
   in-memory alias set (it's SQLite, not a vector DB — fuzzy runs in Python). A
   match below the high-confidence threshold (0.90) is returned with
   `requires_confirmation: true` so the caller asks a human before trusting it.
4. **Unmatched** — anything no variant resolves is returned in `unmatched`,
   never silently dropped.

Matches de-duplicate by resolved `entity_id` (the first candidate that lands on
an entity wins).

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

**cURL examples:**

Test with brand names and aliases:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/check-conflicts \
  -H "Content-Type: application/json" \
  -d '{
    "western_medicines": ["Coumadin"],
    "eastern_medicines": ["danshen"]
  }'
# Returns same result as "warfarin" — aliases are resolved
```

Test with no conflicts found:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/check-conflicts \
  -H "Content-Type: application/json" \
  -d '{
    "western_medicines": ["warfarin"],
    "eastern_medicines": ["ginkgo"]
  }'
# May return [] if this pair is not in the dataset
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

**`entity_aliases`** — every normalized name form → `entity_id` (preferred name, latin, pinyin, chinese,
each common name, plus `/`-split and parenthetical-stripped variants). Each form is expanded with the same
normalization the resolver applies at query time — lowercasing, tone-stripped pinyin, and OpenCC
simplified⇄traditional Chinese — so either Chinese script or tone-free pinyin lands on an **exact** hit.
Indexed on `alias`; unique on `(alias, entity_id)`. This is what makes lookups alias-aware.

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

### Ingesting the vocabularies (CSV)

The interaction links are authored by hand; the **name vocabularies** the resolver matches against arrive
separately as CSVs and are folded into `entities.json`. There are two ingesters (sharing one core,
`ingest_common.py`):

```bash
python ingest_herbs.py    path/to/herbs.csv      # TCM herbs  (HERB_DATASET_SPEC.md)
python ingest_western.py  path/to/western.csv    # Western drugs
#   add --dry-run to preview, --no-seed to skip the re-seed
```

Each writes `entities.json` and re-seeds. Run them in any order; the result is the same and re-running is
idempotent. The shared merge rules:

- **Every existing entity is kept**, so the curated interaction links never dangle (no carry-over step).
- **Entity_ids are preserved by name**: a row matching an existing curated entity (of *either* kind) reuses
  its id and merges the CSV's spellings in as aliases, keeping the curated display name. So `Glucophage`
  folds into the curated **Metformin** `E-0124`, and a herb sold as a supplement (e.g. **ginger**, which
  appears in *both* CSVs) stays a single entity instead of being duplicated across types.
- **Literal duplicate rows collapse** (matched on a high-precision identity — Chinese+Latin for a herb,
  generic name for a drug — so genuinely distinct entries that merely share a loose English name, like
  白术 vs 蒼朮 both "Atractylodes", are *not* wrongly merged).
- **New entries get fresh ids** above every existing id.

The herb CSV follows [`../HERB_DATASET_SPEC.md`](../HERB_DATASET_SPEC.md); the Western CSV has columns
`generic_name, brand_names (pipe-separated), drug_class, uses` (`uses` is an indication, not a name, so it
is not aliased). A tiny `mock_herbs.csv` is included to validate the herb pipeline against the hero pair.

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

## Dataset Statistics

After running `python seed.py`, you'll see output like:

```
# curated baseline (entities.json as authored):
Seeded 46 entities, 231 aliases, 51 interactions.
# after ingesting both provided CSVs (ingest_herbs.py TCM_HERBS_DATASET.csv; ingest_western.py WESTERN_MEDICATIONS_DATASET.csv):
Seeded 756 entities, 3336 aliases, 51 interactions.
  by class: {'TCM-WM': 30, 'WM-WM': 12, 'TCM-TCM': 9}
```

### Breakdown

- **Curated baseline — 46 entities:** 24 WM drugs + 22 TCM herbs (the entities the 51 interactions
  reference). Both vocabularies then expand via the ingesters: the 332-herb CSV and the 439-drug CSV grow
  the set to **756 entities** (curated ids preserved by name; literal duplicate rows and cross-dataset
  substances like ginger collapse to one entity each).
- **~4–5 aliases per entity:** preferred name + synonyms/brands + `/`-splits + tone-stripped pinyin + OpenCC
  simplified/traditional.
- **51 interactions:** 30 TCM-WM, 12 WM-WM, 9 TCM-TCM
  - **TCM-WM:** The core product focus (what the API endpoint returns)
  - **WM-WM:** Drug-drug interactions (stored for future endpoints)
  - **TCM-TCM:** Herb-herb interactions (stored for future endpoints)

---

## File Layout

| File | Responsibility |
|------|---|
| `main.py` | FastAPI app, health probe, `/api/v1/resolve` + `/api/v1/check-conflicts` endpoints |
| `models.py` | Pydantic request/response schemas (incl. `ResolveRequest`/`ResolveResponse`) |
| `resolver.py` | Deterministic name→entity resolution: normalize + exact alias + `rapidfuzz` fallback |
| `database.py` | SQLAlchemy ORM models (`Entity`, `EntityAlias`, `Interaction`), engine, sessions |
| `seed.py` | ETL: loads `Medicine_data/*.json`, validates, populates DB, builds alias index |
| `ingest_common.py` | Shared CSV→entity merge core (preserve ids by name, de-dup, keep all base entities) |
| `ingest_herbs.py` | Ingest a TCM herb CSV into `entities.json` + re-seed (thin wrapper over the core) |
| `ingest_western.py` | Ingest a Western-drug CSV into `entities.json` + re-seed (thin wrapper over the core) |
| `mock_herbs.csv` | Tiny sample CSV (hero-pair herb + a novel one) to validate ingest before the real CSV |
| `Medicine_data/entities.json` | 46 entities (WM drugs + TCM herbs) with all name forms |
| `Medicine_data/interactions.json` | 51 sourced interaction pairs (all three classes) |
| `Medicine_data/SOURCES.md` | Full citations and evidence links |
| `Medicine_data/coverage_report.md` | Interaction coverage analysis |
| `requirements.txt` | Deps: `fastapi`, `uvicorn[standard]`, `sqlalchemy`, `rapidfuzz`, `opencc-python-reimplemented` |

---

## Dataset Contract

The database directly consumes the **curated clinical dataset** in [`Medicine_data/`](Medicine_data/).

### Source Data

Two JSON files define the dataset:

**`entities.json`** — 46 medical entities (drugs/herbs/formulas)
- Each entity has a stable `entity_id` (e.g., `"E-0001"`)
- All name forms: `preferred_name`, `latin`, `pinyin`, `chinese`, `common_names[]`
- Type: `"WM-drug"` | `"TCM-herb"` | `"TCM-formula"`
- WM-specific: `drug_class`, `rxnorm_id`
- All: `active_constituents[]`

**`interactions.json`** — 51 sourced interaction pairs
- Each pair has an `id` (e.g., `"INT-0001"`)
- References two entities by `entity_id`: `agent_a_id`, `agent_b_id`
- Class: `"TCM-WM"` (30), `"WM-WM"` (12), `"TCM-TCM"` (9)
- Severity: `"contraindicated"` | `"major"` | `"moderate"` | `"minor"`
- Clinical explainability: `mechanism`, `clinical_effect`, `management`
- Evidence: `evidence_level`, `sources[]` (PMID, DOI, case reports, etc.)

### Ingestion Pipeline

`seed.py` performs the ETL:

1. **Load** — Parse `entities.json` and `interactions.json`
2. **Validate** — Ensure every `agent_*_id` references a known entity (fail loudly if not)
3. **Rebuild** — Drop and recreate all tables (idempotent; safe to re-run)
4. **Populate entities** — Insert all 46 entities
5. **Generate aliases** — For each entity, create lowercased variants:
   - All name fields + common names
   - "/" splits (compound names)
   - Parenthetical-stripped forms
   - De-duplicate and index
6. **Populate interactions** — Insert all 51 pairs (all three classes)
7. **Report** — Print summary counts

### Evolving the Dataset

When the dataset changes:

1. Replace `Medicine_data/entities.json` and/or `interactions.json`
2. Re-run: `python seed.py`
3. Test immediately: the new data is live

No code changes needed. The tables are rebuilt from the JSON as the source of truth.

### Extending to WM-WM and TCM-TCM

The database already stores all three interaction classes. To surface WM-WM or TCM-TCM:

1. Edit `main.py` — change `_LIVE_CLASS = "TCM-WM"` to filter by class, or create new endpoints
2. Test the new endpoint
3. Update the response contract if needed
4. Keep the TCM-WM endpoint backward-compatible

Example: new endpoint `POST /api/v1/check-wm-wm-conflicts` for drug-drug interactions.
