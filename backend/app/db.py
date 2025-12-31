from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from .settings import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema() -> None:
    with engine.begin() as conn:
        conn.execute(
            text("ALTER TABLE audio_submissions ADD COLUMN IF NOT EXISTS summary TEXT")
        )
