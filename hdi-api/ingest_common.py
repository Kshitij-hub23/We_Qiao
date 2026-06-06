"""Shared CSV → entity ingestion core (used by ingest_herbs.py + ingest_western.py).

Both the TCM herb vocabulary and the Western drug vocabulary are delivered as
CSVs that need folding into `entities.json` under the same rules:

- **Keep every existing entity.** The base entities (curated drugs/herbs the
  interactions reference) are always retained, so the interaction links never
  dangle — no special carry-over step needed.
- **Preserve entity_ids by name.** A CSV row whose name matches an existing
  entity (of *either* kind) reuses that entity's id and merges its spellings in as
  aliases, keeping the curated display name. This both protects the curated links
  and prevents a herb sold as a supplement (e.g. ginger) from being duplicated as
  a separate Western entity.
- **De-duplicate within a run.** Two CSV rows naming the same thing collapse onto
  one entity (the source CSVs contain a few literal duplicate rows).
- **Assign fresh ids** above every existing id for genuinely new entries.

The two datasets differ only in how a CSV row maps to entity fields and names;
that variation is injected via callbacks, keeping this merge logic single-sourced.

Because every existing entity is kept and matching spans both kinds, the two CSVs
compose into one `entities.json` in either order, and re-running an ingest is
idempotent (rows re-match their own entities instead of duplicating them).
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Callable, Dict, List, Optional

from resolver import normalize_variants

DATA_DIR = Path(__file__).parent / "Medicine_data"
DEFAULT_ENTITIES = DATA_DIR / "entities.json"
DEFAULT_INTERACTIONS = DATA_DIR / "interactions.json"

# Callback types: build an entity dict from a row+id, and list a row's names.
RowToEntity = Callable[[dict, str], dict]
RowNames = Callable[[dict], List[str]]


def split_pipes(cell: Optional[str]) -> List[str]:
    """Split a pipe-separated CSV cell into trimmed, non-empty values."""
    if not cell:
        return []
    return [part.strip() for part in cell.split("|") if part.strip()]


def dedupe(values: List[str]) -> List[str]:
    """Case-insensitive de-dup preserving first-seen order; drops empties."""
    seen: set[str] = set()
    out: List[str] = []
    for value in values:
        key = (value or "").strip().lower()
        if key and key not in seen:
            seen.add(key)
            out.append(value.strip())
    return out


def _next_id_factory(existing_ids: List[str]):
    """Allocate fresh "E-####" ids above every numeric id already in use."""
    import re

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

    Used to preserve ids: a CSV row that normalizes onto any existing variant
    reuses that entity's id. Lower ids win on collision (deterministic). Reads the
    standard name fields plus common_names, so it works for both WM (preferred_name
    + brand common_names) and TCM (preferred_name/latin/pinyin/chinese + common_names).
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


def _merge_names_into(entity: dict, names: List[str]) -> dict:
    """Fold extra name strings into an existing entity's common_names (alias them).

    The interaction-referenced entity keeps its canonical display name and rich
    fields; the CSV's names are added as aliases via common_names. This protects
    the existing links while letting the CSV's spellings resolve.
    """
    merged = dict(entity)
    merged["common_names"] = dedupe(list(entity.get("common_names") or []) + names)
    return merged


def merge_csv(
    base: List[dict],
    rows: List[dict],
    *,
    row_to_entity: RowToEntity,
    row_names: RowNames,
    identity_names: RowNames,
    primary_key: str,
) -> tuple[List[dict], dict]:
    """Fold CSV rows into the base entities; return (merged_entities, summary).

    Every base entity is kept. Each row is matched in two ways:

    1. **Against the base** entities using *all* its names (`row_names`). The base
       set is small and curated, so liberal matching safely preserves curated ids
       and folds a cross-kind duplicate (e.g. ginger appearing in both datasets)
       into the existing entity instead of creating a second one.
    2. **Against entities created earlier in this run**, but only on a
       high-precision `identity_names` key (e.g. Chinese+Latin for a herb, generic
       name for a drug). This collapses literal duplicate CSV rows WITHOUT merging
       genuinely distinct entries that merely share a loose English name (白术 and
       苍术 are both "Atractylodes" but are different herbs).

    Matched rows merge their names in as aliases; unmatched rows become new
    entities with fresh ids.
    """
    result: Dict[str, dict] = {e["entity_id"]: dict(e) for e in base}
    base_index: Dict[str, str] = _alias_index(base)  # any name variant -> base id
    run_index: Dict[str, str] = {}  # identity variant -> id created this run
    allocate = _next_id_factory(list(result))

    def lookup(names: List[str], index: Dict[str, str]) -> Optional[str]:
        for name in names:
            for variant in normalize_variants(name):
                if variant in index:
                    return index[variant]
        return None

    n_rows = n_preserved = n_merged_dup = n_new = 0
    base_ids = set(result)
    merged_existing: set[str] = set()
    for row in rows:
        if not (row.get(primary_key) or "").strip():
            continue
        n_rows += 1
        names = row_names(row)
        idents = identity_names(row)
        override = (row.get("entity_id") or "").strip()

        target = None
        if override:
            target = override  # explicit id wins (existing -> merge, else -> new)
        else:
            target = lookup(names, base_index) or lookup(idents, run_index)

        if target and target in result:
            result[target] = _merge_names_into(result[target], names)
            if target in base_ids and target not in merged_existing:
                merged_existing.add(target)
                n_preserved += 1
            else:
                n_merged_dup += 1
        else:
            entity_id = target or allocate()  # honor an explicit new entity_id override
            result[entity_id] = row_to_entity(row, entity_id)
            for ident in idents:
                for variant in normalize_variants(ident):
                    run_index.setdefault(variant, entity_id)
            n_new += 1

    merged = sorted(result.values(), key=lambda e: e["entity_id"])
    summary = {
        "csv_rows": n_rows,
        "ids_preserved": n_preserved,           # rows that matched an existing curated entity
        "duplicate_rows_merged": n_merged_dup,  # literal duplicate rows collapsed
        "ids_new": n_new,
        "base_entities": len(base),
        "total_entities": len(merged),
    }
    return merged, summary


def run_cli(
    *,
    description: str,
    row_to_entity: RowToEntity,
    row_names: RowNames,
    identity_names: RowNames,
    primary_key: str,
) -> None:
    """Shared argparse CLI: load, merge, (optionally) write + re-seed."""
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("csv", type=Path, help="CSV file to ingest")
    parser.add_argument("--entities", type=Path, default=DEFAULT_ENTITIES)
    parser.add_argument("--out", type=Path, default=None, help="Output path (default: --entities)")
    parser.add_argument("--dry-run", action="store_true", help="Print summary; write nothing.")
    parser.add_argument("--no-seed", action="store_true", help="Do not re-seed the DB after writing.")
    args = parser.parse_args()

    if not args.csv.exists():
        parser.error(f"CSV not found: {args.csv}")

    base = json.loads(args.entities.read_text(encoding="utf-8"))
    with args.csv.open(encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.DictReader(fh))

    merged, summary = merge_csv(
        base,
        rows,
        row_to_entity=row_to_entity,
        row_names=row_names,
        identity_names=identity_names,
        primary_key=primary_key,
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
