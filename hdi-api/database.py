"""SQLite database setup for the Herb-Drug Interaction (HDI) API.

SCHEMA DESIGN
=============
The database models the curated clinical dataset from `Medicine_data/` in a
normalized form to enable efficient queries and support all interaction classes.

Three tables:
1. entities — normalized drugs/herbs/formulas with stable entity_id (PK)
2. entity_aliases — every name variant (preferred, latin, pinyin, chinese, common)
   for free-text resolution
3. interactions — all curated pairs, all three classes (TCM-WM, WM-WM, TCM-TCM)

INITIALIZATION
==============
Tables are created empty on startup by init_db() (called by main.py's lifespan).
Actual data is loaded by seed.py, which reads `entities.json` and
`interactions.json` from `Medicine_data/`, validates referential integrity,
and rebuilds the tables from scratch (idempotent operation).

THREADING
=========
`check_same_thread=False` is required because FastAPI serves requests on
different threads; SQLite by default forbids sharing a connection across threads.
Each request still gets its own scoped session via get_db(), so thread isolation
is maintained at the request level — no cross-request state issues.

USAGE
=====
- init_db(): Create tables (idempotent; called on startup)
- get_db(): FastAPI dependency; yields a fresh session closed after the request
- Query examples in seed.py and main.py
"""

from sqlalchemy import Column, ForeignKey, Index, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Local SQLite file living alongside this module.
SQLALCHEMY_DATABASE_URL = "sqlite:///./hdi.db"

# `check_same_thread=False` is required for SQLite when used with FastAPI,
# since requests may be served across different threads.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class Entity(Base):
    """A single normalized drug, herb, or formula.

    REPRESENTS
    ==========
    One entity in the curated dataset: either a Western pharmaceutical drug (WM-drug)
    or a Traditional Chinese Medicine item (TCM-herb or TCM-formula). Each has a
    stable, human-readable entity_id for cross-dataset references.

    SOURCE
    ======
    Mirrors exactly one record in `Medicine_data/entities.json`. All fields are
    persisted, including those not currently surfaced by the API (e.g., drug_class,
    rxnorm_id, active_constituents), so the schema can grow without data loss.

    FIELDS
    ======
    entity_id: Stable primary key, human-readable (e.g., "E-0001")
    preferred_name: Canonical name for display (e.g., "Warfarin", "Danshen")
    type: One of "WM-drug", "TCM-herb", "TCM-formula"

    WM-specific fields:
      drug_class: Pharmacological category (e.g., "anticoagulant")
      rxnorm_id: RxNorm identifier for linking to external standards

    TCM-specific fields:
      latin: Botanical binomial (e.g., "Salvia miltiorrhiza")
      pinyin: Romanized name (e.g., "danshen")
      chinese: Chinese characters (e.g., "丹參")

    All entities:
      common_names: JSON array of synonyms/alternate names
      active_constituents: JSON array of chemical components (TCM only;
                          intentionally not used for alias matching to avoid
                          false matches on constituent names)

    RELATIONSHIPS
    =============
    Referenced by:
    - EntityAlias.entity_id (one entity → many aliases)
    - Interaction.agent_a_id, agent_b_id (one entity → multiple interactions)
    """

    __tablename__ = "entities"

    entity_id = Column(String, primary_key=True)  # e.g. "E-0001"
    preferred_name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # "WM-drug" | "TCM-herb" | "TCM-formula"
    drug_class = Column(String, nullable=True)  # WM only
    rxnorm_id = Column(String, nullable=True)  # WM only
    latin = Column(String, nullable=True)  # TCM
    pinyin = Column(String, nullable=True)  # TCM
    chinese = Column(String, nullable=True)  # TCM
    common_names = Column(Text, nullable=True)  # JSON array
    active_constituents = Column(Text, nullable=True)  # JSON array


class EntityAlias(Base):
    """A lowercased name variant that resolves to one entity.

    PURPOSE
    =======
    Enables free-text resolution. When a user types "coumadin", "Warfarin",
    "warfarin", or any other name form, this table maps all variants to the
    canonical entity.

    HOW IT WORKS
    ============
    One entity generates many aliases during ingestion (see seed.py:_variants()):
    - All fields that carry names: preferred_name, latin, pinyin, chinese, common_names
    - All variants of those: "/" splits (e.g., "fuzi / wutou" → "fuzi" and "wutou")
    - Parenthetical-stripped forms (e.g., "bai guo (seed)" → "bai guo")
    - All lowercased (so "Warfarin", "WARFARIN", "warfarin" all match)

    Example aliases for Warfarin (entity E-0003):
      - "warfarin" (preferred_name)
      - "coumadin" (common name, resolved from alias lookup)
      (Note: not all common names are shown; see entities.json for full list)

    UNIQUENESS
    ==========
    Unique constraint is on (alias, entity_id), not just alias. This is because
    the same lowercased name string may appear in different entities' fields:
    - "aspirin" might be both a preferred name and a common name
    - Multiple entities might have overlapping name fields (rare but possible)
    - Duplicate aliases for the same entity are de-duplicated during ingestion

    USAGE IN QUERIES
    ================
    The endpoint queries this table to resolve incoming names:
      SELECT entity_id FROM entity_aliases WHERE alias IN ('warfarin', 'danshen', ...)
    Then filters interactions by matching entity IDs.
    """

    __tablename__ = "entity_aliases"

    id = Column(Integer, primary_key=True)
    alias = Column(String, nullable=False, index=True)  # always lowercased
    entity_id = Column(String, ForeignKey("entities.entity_id"), nullable=False, index=True)

    __table_args__ = (
        Index("ix_alias_entity", "alias", "entity_id", unique=True),
    )


class Interaction(Base):
    """A single curated interaction between two entities.

    REPRESENTS
    ==========
    One documented interaction pair: e.g., warfarin (WM-drug) + danshen (TCM-herb).
    The interaction_class determines the pair type (TCM-WM, WM-WM, TCM-TCM).

    SOURCE
    ======
    Mirrors exactly one record in `Medicine_data/interactions.json`. Every field
    is persisted, including those not yet surfaced by the API, so the schema can
    support future endpoints without data loss or migration.

    FIELDS (from interactions.json)
    ==============================
    interaction_id: Stable unique key (e.g., "INT-0001")
    agent_a_id, agent_b_id: Foreign keys to Entity; order not significant
      (a TCM-WM pair may have the WM drug as agent_a or agent_b)

    severity: "contraindicated" | "major" | "moderate" | "minor"
      Categorizes risk level; used by endpoint to sort results

    effect_direction: e.g., "additive", "antagonistic", "altered_bioavailability"
      Describes how the agents interact mechanistically

    CLINICAL EXPLAINABILITY (all in the DB, not all in API response yet)
    =========================================================================
    mechanism: Biochemical explanation (e.g., "danshen inhibits CYP3A4")
    clinical_effect: Patient-visible consequence (e.g., "increased bleeding")
    management: Recommendation for mitigation (e.g., "monitor INR")

    evidence_level: "established" | "probable" | "possible" | "theoretical"
      Confidence in the interaction claim, based on source type

    sources: JSON array of {type, ref, note}
      Evidence: PMID (PubMed), DOI, DB (database ID), case reports, etc.
      Example: {"type": "PMID", "ref": "12345678", "note": "Study showed..."}

    CLASS & FILTERING
    ================
    interaction_class: "TCM-WM" | "WM-WM" | "TCM-TCM"
      Today's endpoint filters to TCM-WM only (the core product feature).
      WM-WM and TCM-TCM rows are stored for future endpoints.

    INDEXES
    =======
    Composite indexes on (interaction_class, agent_a_id) and
    (interaction_class, agent_b_id) speed up the per-class agent lookups.
    """

    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True)
    interaction_id = Column(String, nullable=False, unique=True, index=True)  # "INT-0001"
    agent_a_id = Column(String, ForeignKey("entities.entity_id"), nullable=False, index=True)
    agent_b_id = Column(String, ForeignKey("entities.entity_id"), nullable=False, index=True)
    interaction_class = Column(String, nullable=False, index=True)  # TCM-WM | WM-WM | TCM-TCM
    severity = Column(String, nullable=True)
    effect_direction = Column(String, nullable=True)
    mechanism = Column(Text, nullable=True)
    clinical_effect = Column(Text, nullable=True)
    management = Column(Text, nullable=True)
    evidence_level = Column(String, nullable=True)
    sources = Column(Text, nullable=True)  # JSON array

    # Speed up the per-class agent lookups performed by the endpoint.
    __table_args__ = (
        Index("ix_interactions_class_a", "interaction_class", "agent_a_id"),
        Index("ix_interactions_class_b", "interaction_class", "agent_b_id"),
    )


def init_db() -> None:
    """Create all tables if they do not already exist. Never seeds data."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency that yields a scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
