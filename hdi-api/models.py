"""Pydantic request/response models for the HDI API."""

from typing import List, Optional

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


class Source(BaseModel):
    """One evidence reference backing an interaction (PMID / DOI / DB id, + note)."""

    type: Optional[str] = None
    ref: Optional[str] = None
    note: Optional[str] = None


class ConflictDetail(BaseModel):
    """A single detected conflict, mirroring an `interactions` row.

    The engine always returns the full record; the Next.js proxy decides which
    fields a given viewer is allowed to see (patients/caretakers get severity
    only; clinicians get everything). `from_attributes` lets us build this
    directly from a SQLAlchemy model.
    """

    western_drug: str
    tcm_herb: str
    severity: str
    mechanism: str
    # Full clinical detail (surfaced to clinicians only by the proxy).
    effect_direction: Optional[str] = None
    clinical_effect: Optional[str] = None
    management: Optional[str] = None
    evidence_level: Optional[str] = None
    sources: List[Source] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class ResolveRequest(BaseModel):
    """Candidate medicine-name strings from the LLM extraction step."""

    candidates: List[str] = Field(
        default_factory=list,
        description="Surface medicine names (any script) to resolve to entities.",
    )


class ResolvedMatch(BaseModel):
    """One candidate resolved to a dataset entity.

    `method` is "exact" (alias hit after normalization) or "fuzzy" (rapidfuzz
    fallback). `requires_confirmation` is true for fuzzy matches below the
    high-confidence threshold — these must be confirmed by a human before they
    enter the conflict check (they are not auto-trusted).
    """

    candidate: str
    entity_id: str
    preferred_name: str
    type: str  # "WM-drug" | "TCM-herb" | "TCM-formula"
    score: float
    method: str
    requires_confirmation: bool


class ResolveResponse(BaseModel):
    """Resolution result: entity-linked matches plus the names nothing matched."""

    matched: List[ResolvedMatch] = Field(default_factory=list)
    unmatched: List[str] = Field(default_factory=list)
