"""Ingest the TCM herb vocabulary from a CSV into the entity dataset.

WHERE THIS FITS
===============
The curated *interactions* (`Medicine_data/interactions.json`) and the Western
drugs they reference are authored by hand. The TCM *herb vocabulary* — the names
the resolver matches against — is delivered separately as a CSV (see
`HERB_DATASET_SPEC.md`). This script folds that CSV into `entities.json` so a
single `python seed.py` rebuilds the database and alias index from it.

It is designed so the real ~500–600-row CSV is a drop-in: run it, re-seed, done.

THE RULES (do not break interaction links)
==========================================
- **Preserve entity_ids by name.** A CSV herb whose name/pinyin/Chinese matches
  an entity already referenced by an interaction reuses that entity's id, so the
  curated interaction links keep pointing at the right herb.
- **Assign fresh ids for the rest**, above every existing id (so new herbs never
  collide with the Western-drug id block).
- **Carry over referenced herbs the CSV omits.** Any TCM entity an interaction
  references that the CSV does not include is kept from the base file — otherwise
  re-seeding would fail referential-integrity validation.
- **Western drugs are left untouched** (they come from the interaction side).

USAGE
=====
    # Overwrite Medicine_data/entities.json and re-seed the DB:
    python ingest_herbs.py path/to/herbs.csv

    # Preview only (no write, no seed):
    python ingest_herbs.py path/to/herbs.csv --dry-run

    # Write to a scratch file without touching the canonical data or DB:
    python ingest_herbs.py path/to/herbs.csv --out /tmp/entities.json --no-seed

CSV COLUMNS (HERB_DATASET_SPEC.md)
==================================
    english_name (req), chinese_name (req), pinyin (req), latin_name,
    common_names (pipe-separated), chinese_alt (pipe-separated), type
    (herb|formula), entity_id (optional override)
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional

from resolver import normalize_variants

DATA_DIR = Path(__file__).parent / "Medicine_data"
DEFAULT_ENTITIES = DATA_DIR / "entities.json"
DEFAULT_INTERACTIONS = DATA_DIR / "interactions.json"

_TYPE_MAP = {"herb": "TCM-herb", "formula": "TCM-formula", "": "TCM-herb"}


def _split_pipes(cell: Optional[str]) -> List[str]:
    """Split a pipe-separated CSV cell into trimmed, non-empty values."""
    if not cell:
        return []
    return [part.strip() for part in cell.split("|") if part.strip()]


def _next_id_factory(existing_ids: List[str]):
    """Allocate fresh "E-####" ids above every numeric id already in use."""
    nums = [int(m.group()) for eid in existing_ids if (m := re.search(r"\d+", eid))]
    counter = (max(nums) + 1) if nums else 1

    def allocate() -> str:
        nonlocal counter
        eid = f"E-{counter:04d}"
        counter += 1
        return eid

    return allocate


def _alias_index(entities: List[dict]) -> Dict[str, str]:
    """Map every normalized name variant of each entity to its entity_id.

    Used to preserve ids: a CSV herb that normalizes onto any existing variant
    reuses that entity's id. Lower ids win on collision (deterministic).
    """
    index: Dict[str, str] = {}
    for entity in entities:
        names = [entity.get(f, "") for f in ("preferred_name", "latin", "pinyin", "chinese")]
        names += entity.get("common_names", []) or []
        for name in names:
            for variant in normalize_variants(name or ""):
                current = index.get(variant)
                if current is None or entity["entity_id"] < current:
                    index[variant] = entity["entity_id"]
    return index


def _row_names(row: dict) -> List[str]:
    """Every name string in a CSV row (for id matching + alias merging)."""
    names = [
        (row.get("english_name") or "").strip(),
        (row.get("latin_name") or "").strip(),
        (row.get("pinyin") or "").strip(),
        (row.get("chinese_name") or "").strip(),
    ]
    names += _split_pipes(row.get("common_names"))
    names += _split_pipes(row.get("chinese_alt"))
    return [n for n in names if n]


def _dedupe(values: List[str]) -> List[str]:
    """Case-insensitive de-dup preserving first-seen order; drops empties."""
    seen: set[str] = set()
    out: List[str] = []
    for value in values:
        key = (value or "").strip().lower()
        if key and key not in seen:
            seen.add(key)
            out.append(value.strip())
    return out


def _row_to_entity(row: dict, entity_id: str) -> dict:
    """Build a fresh entity record from one CSV row (for a brand-new herb)."""
    # Extra Chinese forms become aliases too — carry them in common_names so the
    # standard alias build (which OpenCC-expands every name field) picks them up.
    common = _dedupe(_split_pipes(row.get("common_names")) + _split_pipes(row.get("chinese_alt")))
    return {
        "entity_id": entity_id,
        "preferred_name": (row.get("english_name") or "").strip(),
        "type": _TYPE_MAP.get((row.get("type") or "").strip().lower(), "TCM-herb"),
        "latin": (row.get("latin_name") or "").strip() or None,
        "pinyin": (row.get("pinyin") or "").strip() or None,
        "chinese": (row.get("chinese_name") or "").strip() or None,
        "common_names": common,
        "active_constituents": [],
    }


def _merge_into(entity: dict, row: dict) -> dict:
    """Fold a CSV row's names into an existing curated entity, preserving id.

    The interaction-referenced entity keeps its canonical display name and rich
    fields (so the curated demo names stay stable); the CSV's names are added as
    aliases via common_names. This both protects the existing links and lets the
    CSV's spellings resolve.
    """
    merged = dict(entity)
    merged["common_names"] = _dedupe(list(entity.get("common_names") or []) + _row_names(row))
    return merged


def ingest(
    csv_path: Path,
    *,
    entities_path: Path = DEFAULT_ENTITIES,
    interactions_path: Path = DEFAULT_INTERACTIONS,
) -> tuple[List[dict], dict]:
    """Merge the CSV herbs into the base entities; return (entities, summary)."""
    base = json.loads(entities_path.read_text(encoding="utf-8"))
    interactions = json.loads(interactions_path.read_text(encoding="utf-8"))

    wm = [e for e in base if not e["type"].startswith("TCM")]
    tcm = [e for e in base if e["type"].startswith("TCM")]
    tcm_by_id = {e["entity_id"]: e for e in tcm}

    preserve_index = _alias_index(tcm)  # match CSV herbs to existing TCM ids
    allocate = _next_id_factory([e["entity_id"] for e in base])

    with csv_path.open(encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.DictReader(fh))

    def match_existing(row: dict) -> Optional[str]:
        """Find an existing TCM id this row corresponds to (any name field)."""
        for name in _row_names(row):
            for variant in normalize_variants(name):
                if variant in preserve_index:
                    return preserve_index[variant]
        return None

    preserved: Dict[str, dict] = {}  # existing id -> entity with CSV names merged in
    new_herbs: List[dict] = []
    for row in rows:
        if not (row.get("english_name") or "").strip():
            continue
        # Resolve this herb: explicit id override > matches an existing entity
        # (merge, preserving id) > brand-new herb with a fresh id.
        override = (row.get("entity_id") or "").strip()
        if override and override in tcm_by_id:
            preserved[override] = _merge_into(preserved.get(override, tcm_by_id[override]), row)
        elif override:
            new_herbs.append(_row_to_entity(row, override))
        elif (existing := match_existing(row)) is not None:
            preserved[existing] = _merge_into(preserved.get(existing, tcm_by_id[existing]), row)
        else:
            new_herbs.append(_row_to_entity(row, allocate()))

    # Carry over (unchanged) any interaction-referenced TCM herb the CSV did not
    # match, so the curated links never dangle after re-seeding.
    referenced = {i["agent_a_id"] for i in interactions} | {i["agent_b_id"] for i in interactions}
    carried = [
        tcm_by_id[eid]
        for eid in sorted(referenced)
        if eid in tcm_by_id and eid not in preserved
    ]

    merged = sorted(wm + list(preserved.values()) + carried + new_herbs, key=lambda e: e["entity_id"])
    summary = {
        "csv_rows": len(rows),
        "ids_preserved": len(preserved),
        "ids_new": len(new_herbs),
        "carried_over": len(carried),
        "wm_kept": len(wm),
        "total_entities": len(merged),
    }
    return merged, summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest the TCM herb CSV into entities.json.")
    parser.add_argument("csv", type=Path, help="CSV file matching HERB_DATASET_SPEC.md")
    parser.add_argument("--entities", type=Path, default=DEFAULT_ENTITIES)
    parser.add_argument("--interactions", type=Path, default=DEFAULT_INTERACTIONS)
    parser.add_argument("--out", type=Path, default=None, help="Output path (default: --entities)")
    parser.add_argument("--dry-run", action="store_true", help="Print summary; write nothing.")
    parser.add_argument("--no-seed", action="store_true", help="Do not re-seed the DB after writing.")
    args = parser.parse_args()

    if not args.csv.exists():
        parser.error(f"CSV not found: {args.csv}")

    merged, summary = ingest(
        args.csv, entities_path=args.entities, interactions_path=args.interactions
    )
    print("Ingest summary:")
    for key, value in summary.items():
        print(f"  {key}: {value}")

    if args.dry_run:
        print("Dry run — nothing written.")
        return

    out = args.out or args.entities
    out.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(merged)} entities to {out}")

    if args.no_seed:
        return
    if (args.out or args.entities) != DEFAULT_ENTITIES:
        print("Skipping seed: output is not the canonical entities.json that seed.py reads.")
        return
    import seed

    seed.seed()


if __name__ == "__main__":
    sys.exit(main())
