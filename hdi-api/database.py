"""SQLite database setup for the Herb-Drug Interaction (HDI) API.

Defines the SQLAlchemy engine, session factory, and the single `interactions`
table. The table is intentionally created empty — it is populated later by a
separate scraper / ingestion pipeline, never seeded here.
"""

from sqlalchemy import Column, Index, Integer, String, Text, create_engine
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


class Interaction(Base):
    """A single curated herb-drug interaction record.

    Rows map directly to the `ConflictDetail` response shape. The table is
    created empty and filled by an external ingestion pipeline.
    """

    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    western_drug = Column(String, index=True, nullable=False)
    tcm_herb = Column(String, index=True, nullable=False)
    interaction_type = Column(String, nullable=True)
    severity = Column(String, nullable=True)
    mechanism = Column(Text, nullable=True)

    # Composite index to speed up the combined drug+herb lookup performed by
    # the conflict-check endpoint.
    __table_args__ = (
        Index("ix_interactions_drug_herb", "western_drug", "tcm_herb"),
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
