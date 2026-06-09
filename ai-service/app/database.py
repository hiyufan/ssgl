"""Database connection and initialization."""

import logging

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Yield a database session and ensure it is closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create the pgvector extension, documents table, and IVFFlat index.

    If PostgreSQL is unavailable, logs a warning and continues — the service
    will start but database-dependent endpoints will fail until the DB is up.
    """
    try:
        with engine.begin() as conn:
            # Enable pgvector extension
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

        # Import models so Base.metadata knows about them
        from app.models.document import Document  # noqa: F401

        Base.metadata.create_all(bind=engine)

        # Create IVFFlat index for approximate nearest-neighbour search
        with engine.begin() as conn:
            conn.execute(text(
                """
                CREATE INDEX IF NOT EXISTS idx_documents_embedding
                ON documents
                USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100)
                """
            ))
        logger.info("Database initialized successfully.")
    except Exception as exc:
        logger.warning(
            "Database initialization failed (service will start but DB "
            "endpoints will be unavailable): %s", exc
        )
