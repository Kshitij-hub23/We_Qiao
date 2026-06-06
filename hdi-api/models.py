"""Pydantic request/response models for the HDI API."""

from typing import List

from pydantic import BaseModel, Field


class InteractionRequest(BaseModel):
    """Incoming payload: the patient's converged medication lists."""

    western_medicines: List[str] = Field(
        default_factory=list,
        description="Western Medicine (WM) drug names to check.",
    )
    eastern_medicines: List[str] = Field(
        default_factory=list,
        description="Traditional Chinese Medicine (TCM) herb/formula names to check.",
    )


class ConflictDetail(BaseModel):
    """A single detected conflict, mirroring an `interactions` row.

    `from_attributes` lets us build this directly from a SQLAlchemy model.
    """

    western_drug: str
    tcm_herb: str
    severity: str
    mechanism: str

    model_config = {"from_attributes": True}
