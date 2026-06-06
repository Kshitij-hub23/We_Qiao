"""Ingest the TCM herb vocabulary from a CSV into the entity dataset.

The curated *interactions* (`Medicine_data/interactions.json`) and the entities
they reference are authored by hand; the TCM **herb vocabulary** (the names the
resolver matches against, ~hundreds of herbs) is delivered separately as a CSV
(see `HERB_DATASET_SPEC.md`). This script folds that CSV into `entities.json` so
a single `python seed.py` rebuilds the database and alias index from it. It only
touches TCM entities — Western drugs are left untouched (see `ingest_western.py`).

The merge rules (preserve ids by name, fresh ids above the existing block, carry
over referenced herbs the CSV omits) live in `ingest_common.py`.

USAGE
=====
    python ingest_herbs.py path/to/herbs.csv            # write entities.json + re-seed
    python ingest_herbs.py path/to/herbs.csv --dry-run  # preview only
    python ingest_herbs.py path/to/herbs.csv --out /tmp/x.json --no-seed

CSV COLUMNS (HERB_DATASET_SPEC.md)
==================================
    english_name (req), chinese_name (req), pinyin (req), latin_name,
    common_names (pipe-separated), chinese_alt (pipe-separated), type
    (herb|formula), entity_id (optional override)
"""

from __future__ import annotations

import sys
from typing import List

from ingest_common import dedupe, run_cli, split_pipes

_TYPE_MAP = {"herb": "TCM-herb", "formula": "TCM-formula", "": "TCM-herb"}


def _row_names(row: dict) -> List[str]:
    """Every name string in a herb CSV row (for id matching + alias merging)."""
    names = [
        (row.get("english_name") or "").strip(),
        (row.get("latin_name") or "").strip(),
        (row.get("pinyin") or "").strip(),
        (row.get("chinese_name") or "").strip(),
    ]
    names += split_pipes(row.get("common_names"))
    names += split_pipes(row.get("chinese_alt"))
    return [n for n in names if n]


def _identity_names(row: dict) -> List[str]:
    """High-precision identity for intra-run de-dup: Chinese name + Latin binomial.

    Distinct herbs differ in these even when they share a loose English name
    (白术 vs 苍术 are both "Atractylodes"); literal duplicate rows share them.
    """
    return [n for n in [(row.get("chinese_name") or "").strip(), (row.get("latin_name") or "").strip()] if n]


def _row_to_entity(row: dict, entity_id: str) -> dict:
    """Build a fresh entity record from one herb CSV row (a brand-new herb)."""
    # Extra Chinese forms become aliases too — carry them in common_names so the
    # standard alias build (which OpenCC-expands every name field) picks them up.
    common = dedupe(split_pipes(row.get("common_names")) + split_pipes(row.get("chinese_alt")))
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


if __name__ == "__main__":
    sys.exit(
        run_cli(
            description="Ingest a TCM herb CSV into entities.json (preserve ids by name).",
            row_to_entity=_row_to_entity,
            row_names=_row_names,
            identity_names=_identity_names,
            primary_key="english_name",
        )
    )
