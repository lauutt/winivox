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
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT")
        )
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSON")
        )
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_key TEXT")
        )
        conn.execute(
            text("ALTER TABLE audio_submissions ADD COLUMN IF NOT EXISTS summary TEXT")
        )
        conn.execute(
            text("ALTER TABLE audio_submissions ADD COLUMN IF NOT EXISTS title TEXT")
        )
        conn.execute(
            text(
                "ALTER TABLE audio_submissions ADD COLUMN IF NOT EXISTS viral_analysis INTEGER"
            )
        )
        conn.execute(
            text("ALTER TABLE audio_submissions ADD COLUMN IF NOT EXISTS description TEXT")
        )
        conn.execute(
            text("ALTER TABLE audio_submissions ADD COLUMN IF NOT EXISTS tags_suggested JSON")
        )
        conn.execute(
            text("ALTER TABLE audio_submissions ADD COLUMN IF NOT EXISTS cover_image_key TEXT")
        )
