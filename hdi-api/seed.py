"""Populate the HDI database from the curated `Medicine_data/` dataset.

PURPOSE
=======
Ingests the normalized clinical dataset (entities.json, interactions.json) into
the SQLite database. Handles all the ETL complexity: data validation, alias
generation, referential integrity checks, and idempotent schema rebuilding.

WORKFLOW
========
1. Load entities.json and interactions.json from Medicine_data/
2. Validate: every interaction's agent_a_id and agent_b_id reference known entities
3. Rebuild: drop all tables and recreate from scratch (idempotent)
4. Populate entities: one row per drug/herb/formula
5. Build aliases: for each entity, generate lowercased name variants:
   - preferred_name, latin, pinyin, chinese
   - all common_names
   - "/" variants (splits compound names like "fuzi / wutou")
   - Parenthetical-stripped forms (e.g., "bai guo (seed)" → "bai guo")
6. Populate interactions: one row per curated pair, all three classes
7. Report: print summary (entity count, alias count, interaction breakdown)

IDEMPOTENCY
===========
The database is completely rebuilt on every run (drop + recreate). This means:
- Safe to re-run: no duplicates, no orphaned data
- No schema drift: always matches the ORM model definitions
- No migration tool needed (appropriate for prototypes; consider Alembic for production)

VALIDATION
==========
Fails loudly if:
- An interaction references a non-existent entity (dangling foreign key)
- entities.json or interactions.json is missing or malformed
- JSON parsing fails

Silently skips invalid fields (e.g., missing optional fields).

RUNNING
=======
From the hdi-api/ directory:
    python seed.py

Or from the repo root:
    cd hdi-api && python seed.py

Re-run whenever the dataset changes (entities.json or interactions.json updated).
The database file (hdi.db) is gitignored and will be recreated.

EXAMPLE OUTPUT
==============
Seeded 46 entities, 189 aliases, 51 interactions.
  by class: {'TCM-WM': 30, 'WM-WM': 12, 'TCM-TCM': 9}
"""

import json
import re
from pathlib import Path
from typing import Iterable

from database import Base, Entity, EntityAlias, Interaction, SessionLocal, engine
from resolver import normalize_variants

DATA_DIR = Path(__file__).parent / "Medicine_data"

# Entity fields that carry human-readable names we want to match free text against.
# `active_constituents` is intentionally excluded — constituents (e.g. "berberine")
# are not the herb itself and would cause false matches.
_NAME_FIELDS = ("preferred_name", "latin", "pinyin", "chinese")


def _variants(value: str) -> Iterable[str]:
    """Yield normalized alias variants from one raw name string.

    HANDLES TWO COMMON PATTERNS
    ===========================
    1. "/" separators (compound names in single field):
       Input: "fuzi / wutou"
       Output: "fuzi", "wutou"

    2. Parenthetical qualifiers (context/form, not the name itself):
       Input: "bai guo (seed)"
       Output: "bai guo (seed)", "bai guo"
       (Both forms are offered; "bai guo" alone catches parent-less variants)

    NORMALIZATION (matches resolver.normalize_variants exactly)
    ===========================================================
    Each form is expanded into: lowercased, tone-stripped pinyin (dānshēn ->
    danshen), and OpenCC simplified⇄traditional Chinese (丹参 ⇄ 丹參). Indexing
    the same variants the resolver computes at query time means a user typing
    either Chinese script or tone-free pinyin lands on an EXACT alias hit.

    USAGE
    =====
    Called once per name field during ingestion. Every variant is added to the
    EntityAlias table, so users can search using any known form.
    """
    if not value:
        return
    for part in value.split("/"):
        part = part.strip()
        if not part:
            continue
        forms = [part]
        stripped = re.sub(r"\(.*?\)", "", part).strip()
        if stripped and stripped.lower() != part.lower():
            forms.append(stripped)
        for form in forms:
            yield from normalize_variants(form)


def _aliases_for(entity: dict) -> set[str]:
    """Generate all lowercased, de-duplicated alias strings for one entity.

    PROCESSES
    =========
    1. Name fields: preferred_name, latin, pinyin, chinese
       (active_constituents is intentionally excluded; chemicals aren't names)
    2. Common names: all entries from the common_names array
    3. Variants: for each name, generates all / -split and parenthetical forms

    DEDUPLICATION
    =============
    Uses a set so duplicate aliases (same lowercased form from different fields
    or variants) appear only once in the EntityAlias table.

    EXAMPLE
    =======
    Warfarin entity:
      preferred_name: "Warfarin"
      common_names: ["Coumadin", ...]
    Yields aliases: {"warfarin", "coumadin", ...}

    Danshen entity:
      pinyin: "danshen"
      chinese: "丹參"
      common_names: ["red sage", ...]
    Yields aliases: {"danshen", "丹参".lower(), "red sage", ...}
    """
    aliases: set[str] = set()
    for field in _NAME_FIELDS:
        aliases.update(_variants(entity.get(field, "")))
    for name in entity.get("common_names", []) or []:
        aliases.update(_variants(name))
    aliases.discard("")
    return aliases


def seed() -> None:
    """Perform the full ingestion pipeline.

    Load, validate, and store the dataset. Rebuilds tables from scratch to ensure
    idempotency (no duplicates, no drift).
    """
    entities = json.loads((DATA_DIR / "entities.json").read_text(encoding="utf-8"))
    interactions = json.loads((DATA_DIR / "interactions.json").read_text(encoding="utf-8"))

    # Fail loudly on referential gaps rather than silently dropping rows.
    entity_ids = {e["entity_id"] for e in entities}
    dangling = [
        i["id"]
        for i in interactions
        if i["agent_a_id"] not in entity_ids or i["agent_b_id"] not in entity_ids
    ]
    if dangling:
        raise ValueError(f"Interactions reference unknown entity ids: {dangling}")

    # Rebuild from scratch so re-runs are idempotent.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        for e in entities:
            db.add(
                Entity(
                    entity_id=e["entity_id"],
                    preferred_name=e["preferred_name"],
                    type=e["type"],
                    drug_class=e.get("drug_class"),
                    rxnorm_id=e.get("rxnorm_id"),
                    latin=e.get("latin"),
                    pinyin=e.get("pinyin"),
                    chinese=e.get("chinese"),
                    common_names=json.dumps(e.get("common_names", []), ensure_ascii=False),
                    active_constituents=json.dumps(
                        e.get("active_constituents", []), ensure_ascii=False
                    ),
                )
            )
            for alias in _aliases_for(e):
                db.add(EntityAlias(alias=alias, entity_id=e["entity_id"]))

        for i in interactions:
            db.add(
                Interaction(
                    interaction_id=i["id"],
                    agent_a_id=i["agent_a_id"],
                    agent_b_id=i["agent_b_id"],
                    interaction_class=i["interaction_class"],
                    severity=i.get("severity"),
                    effect_direction=i.get("effect_direction"),
                    mechanism=i.get("mechanism"),
                    clinical_effect=i.get("clinical_effect"),
                    management=i.get("management"),
                    evidence_level=i.get("evidence_level"),
                    sources=json.dumps(i.get("sources", []), ensure_ascii=False),
                )
            )

        db.commit()

        # Report what landed.
        n_entities = db.query(Entity).count()
        n_aliases = db.query(EntityAlias).count()
        n_int = db.query(Interaction).count()
        by_class = {
            cls: db.query(Interaction).filter(Interaction.interaction_class == cls).count()
            for cls in ("TCM-WM", "WM-WM", "TCM-TCM")
        }
        print(f"Seeded {n_entities} entities, {n_aliases} aliases, {n_int} interactions.")
        print(f"  by class: {by_class}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
