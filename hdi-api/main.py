"""HDI API — deterministic herb-drug conflict-detection endpoint.

This service performs the *deterministic* safety lookup of the Qiáo system:
given a patient's Western Medicine (WM) and Traditional Chinese Medicine (TCM)
lists, it returns the known interactions found in the curated dataset. The
verdict is never model-generated — it is a straight database lookup.

Free-text names are resolved to dataset entities through the alias index, so
input written as a brand name, pinyin, latin, or Chinese name still matches.
The database stores all three interaction classes; this endpoint surfaces
TCM-WM (the product's core value); WM-WM and TCM-TCM are reserved for later.
"""

from contextlib import asynccontextmanager
from typing import List

from fastapi import Depends, FastAPI
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from database import Entity, EntityAlias, Interaction, get_db, init_db
from models import ConflictDetail, InteractionRequest

# Only TCM-WM is consumed by the live endpoint today.
_LIVE_CLASS = "TCM-WM"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist on startup (creates empty tables if the database file
    # is fresh). Never seeds data — run `python seed.py` to populate.
    init_db()
    yield


app = FastAPI(
    title="Qiáo HDI API",
    description="Deterministic herb-drug interaction conflict detection.",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["meta"])
def health() -> dict:
    """Liveness probe."""
    return {"status": "ok"}


@app.post(
    "/api/v1/check-conflicts",
    response_model=List[ConflictDetail],
    tags=["conflicts"],
)
def check_conflicts(
    request: InteractionRequest,
    db: Session = Depends(get_db),
) -> List[ConflictDetail]:
    """Return every known TCM-WM interaction between the supplied agents.

    QUERY PIPELINE
    ==============
    1. Trim & lowercase: Both lists are trimmed (strip) and lowercased
    2. Short-circuit: If either list becomes empty, return [] immediately
    3. Resolve: All names are resolved to entity_ids via the entity_aliases table
       - Handles brand names, pinyin, latin, Chinese, common names, variants
       - Returns immediately if any name doesn't resolve (empty id-set)
    4. Match: Find TCM-WM interactions where:
       - interaction_class == "TCM-WM"
       - One agent is in the western_ids set AND
       - The other agent is in the eastern_ids set
       - Matches either agent orientation (WM may be agent_a or agent_b)
    5. Label: Resolve involved entities once to get preferred_name for display
    6. Return: List of ConflictDetail objects (matched pairs with severity/mechanism)

    EXAMPLE
    =======
    Input: {"western_medicines": ["Coumadin"], "eastern_medicines": ["danshen"]}
      → Resolve "coumadin" → entity E-0003 (Warfarin), "danshen" → E-0001
      → Find TCM-WM rows where (agent_a=E-0003, agent_b=E-0001) or vice versa
      → Returns: [{western_drug="Warfarin", tcm_herb="Danshen", ...}]

    INPUT VALIDATION
    ================
    Empty/whitespace items are trimmed; empty lists are accepted but return [].
    Unknown names simply don't resolve (silently dropped, no error).

    RESPONSE SHAPE
    ==============
    Each ConflictDetail includes:
    - western_drug: preferred_name of the WM-drug entity
    - tcm_herb: preferred_name of the TCM agent
    - severity: level of risk from the interaction record
    - mechanism: clinical explanation

    NOTE: The full interaction records (clinical_effect, management,
    evidence_level, sources) are stored in the DB but not surfaced here yet.
    """
    western = [name.strip().lower() for name in request.western_medicines if name.strip()]
    eastern = [name.strip().lower() for name in request.eastern_medicines if name.strip()]
    if not western or not eastern:
        return []

    # Resolve incoming names -> entity ids via the alias index (one query).
    lookup = set(western) | set(eastern)
    alias_to_ids: dict[str, set[str]] = {}
    for row in db.query(EntityAlias).filter(EntityAlias.alias.in_(lookup)).all():
        alias_to_ids.setdefault(row.alias, set()).add(row.entity_id)

    western_ids = {eid for name in western for eid in alias_to_ids.get(name, ())}
    eastern_ids = {eid for name in eastern for eid in alias_to_ids.get(name, ())}
    if not western_ids or not eastern_ids:
        return []

    # A TCM-WM row matches in either agent orientation: the WM drug may be
    # stored as agent_a or agent_b.
    rows = (
        db.query(Interaction)
        .filter(
            Interaction.interaction_class == _LIVE_CLASS,
            or_(
                and_(
                    Interaction.agent_a_id.in_(western_ids),
                    Interaction.agent_b_id.in_(eastern_ids),
                ),
                and_(
                    Interaction.agent_b_id.in_(western_ids),
                    Interaction.agent_a_id.in_(eastern_ids),
                ),
            ),
        )
        .all()
    )
    if not rows:
        return []

    # Resolve the involved entities once to label each side by preferred name.
    involved = {r.agent_a_id for r in rows} | {r.agent_b_id for r in rows}
    entities = {
        e.entity_id: e
        for e in db.query(Entity).filter(Entity.entity_id.in_(involved)).all()
    }

    results: List[ConflictDetail] = []
    for r in rows:
        a, b = entities[r.agent_a_id], entities[r.agent_b_id]
        wm, tcm = (a, b) if a.type == "WM-drug" else (b, a)
        results.append(
            ConflictDetail(
                western_drug=wm.preferred_name,
                tcm_herb=tcm.preferred_name,
                severity=r.severity,
                mechanism=r.mechanism,
            )
        )
    return results
