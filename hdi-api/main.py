"""HDI API — deterministic herb-drug conflict-detection endpoint.

This service performs the *deterministic* safety lookup of the Qiáo system:
given a patient's Western Medicine (WM) and Traditional Chinese Medicine (TCM)
lists, it returns the known interactions found in the curated dataset. The
verdict is never model-generated — it is a straight database lookup.
"""

from contextlib import asynccontextmanager
from typing import List

from fastapi import Depends, FastAPI
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import Interaction, get_db, init_db
from models import ConflictDetail, InteractionRequest


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist on startup (creates an empty `interactions` table
    # if the database file is fresh). Never seeds data.
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
    """Return every known interaction between the supplied WM and TCM agents.

    Matching is case-insensitive: a row is returned when its `western_drug`
    matches any item in `western_medicines` AND its `tcm_herb` matches any
    item in `eastern_medicines`. Returns `[]` when either list is empty or no
    interaction is found.
    """
    # Short-circuit: nothing to match against.
    if not request.western_medicines or not request.eastern_medicines:
        return []

    # Normalize the inbound lists once so the DB comparison is case-insensitive
    # against indexed columns via a single IN (...) AND IN (...) query.
    western = [name.strip().lower() for name in request.western_medicines if name.strip()]
    eastern = [name.strip().lower() for name in request.eastern_medicines if name.strip()]

    if not western or not eastern:
        return []

    rows = (
        db.query(Interaction)
        .filter(
            func.lower(Interaction.western_drug).in_(western),
            func.lower(Interaction.tcm_herb).in_(eastern),
        )
        .all()
    )

    return [ConflictDetail.model_validate(row) for row in rows]
