"""Ingest the Western-drug vocabulary from a CSV into the entity dataset.

Mirrors `ingest_herbs.py`, but for Western Medicine (WM) drugs. The curated
interactions reference a handful of WM drugs (`E-0101..`); this folds in the full
WM vocabulary so the resolver can map brand/generic names onto entities. It only
touches WM-drug entities — TCM herbs are left untouched — so the two CSVs compose
into one `entities.json` regardless of ingest order.

The merge rules (preserve ids by name, fresh ids above the existing block, carry
over referenced drugs the CSV omits) live in `ingest_common.py`.

USAGE
=====
    python ingest_western.py path/to/western.csv            # write entities.json + re-seed
    python ingest_western.py path/to/western.csv --dry-run  # preview only

CSV COLUMNS
===========
    generic_name (req)  — canonical display name (e.g. "Atorvastatin")
    brand_names         — pipe-separated brand names (e.g. "Synthroid|Levoxyl") → aliases
    drug_class          — pharmacological class (stored on the entity)
    uses                — pipe-separated indications; NOT stored as a name (indications
                          aren't names — aliasing them would cause false matches, same
                          rationale as TCM active_constituents)
"""

from __future__ import annotations

import sys
from typing import List

from ingest_common import dedupe, run_cli, split_pipes


def _row_names(row: dict) -> List[str]:
    """Every name string in a Western CSV row (for id matching + alias merging)."""
    names = [(row.get("generic_name") or "").strip()]
    names += split_pipes(row.get("brand_names"))
    return [n for n in names if n]


def _identity_names(row: dict) -> List[str]:
    """High-precision identity for intra-run de-dup: the generic name uniquely
    identifies a drug, so duplicate rows collapse without merging distinct drugs."""
    return [n for n in [(row.get("generic_name") or "").strip()] if n]


def _row_to_entity(row: dict, entity_id: str) -> dict:
    """Build a fresh WM-drug entity record from one Western CSV row."""
    return {
        "entity_id": entity_id,
        "preferred_name": (row.get("generic_name") or "").strip(),
        "type": "WM-drug",
        "drug_class": (row.get("drug_class") or "").strip() or None,
        "rxnorm_id": None,  # not provided by the CSV
        "common_names": dedupe(split_pipes(row.get("brand_names"))),
        "active_constituents": [],
    }


if __name__ == "__main__":
    sys.exit(
        run_cli(
            description="Ingest a Western-drug CSV into entities.json (preserve ids by name).",
            row_to_entity=_row_to_entity,
            row_names=_row_names,
            identity_names=_identity_names,
            primary_key="generic_name",
        )
    )
