"""SQLite database setup for the Herb-Drug Interaction (HDI) API.

Models the curated dataset in `Medicine_data/` in its normalized form: every
drug/herb is an `Entity` with a stable `entity_id`, and every `Interaction`
references two entity IDs. An `EntityAlias` table indexes every name variant
(preferred name, latin, pinyin, chinese, common names) so free-text input in
any of those forms resolves to the right entity.

The table is created empty and populated by `seed.py` (which reads the JSON in
`Medicine_data/`) — never seeded here. All three interaction classes (TCM-WM,
WM-WM, TCM-TCM) are stored; the live conflict-check endpoint currently uses
TCM-WM only.
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

    Mirrors a record in `Medicine_data/entities.json`. List-valued fields
    (`common_names`, `active_constituents`) are stored as JSON-encoded text.
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

    One entity has many aliases (preferred name, latin, pinyin, chinese, every
    common name, plus split/parenthetical-stripped variants). The same alias
    string may legitimately point at more than one entity, so the uniqueness
    constraint is on the (alias, entity_id) pair, not on `alias` alone.
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

    Mirrors a record in `Medicine_data/interactions.json`. Stores all three
    interaction classes; the conflict-check endpoint filters to "TCM-WM" today.
    `sources` is JSON-encoded text. The full explainability fields
    (`clinical_effect`, `management`, `evidence_level`, `sources`) are persisted
    for later use even though the current API response surfaces only a subset.
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
