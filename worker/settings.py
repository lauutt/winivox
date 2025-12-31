import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://winivox:winivox@postgres:5432/winivox",
    )
    redis_url: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    s3_endpoint: str = os.getenv("MINIO_ENDPOINT", "http://minio:9000")
    s3_access_key: str = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    s3_secret_key: str = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    s3_region: str = os.getenv("MINIO_REGION", "us-east-1")
    s3_private_bucket: str = os.getenv("MINIO_PRIVATE_BUCKET", "audio-private")
    s3_public_bucket: str = os.getenv("MINIO_PUBLIC_BUCKET", "audio-public")
    s3_artifacts_bucket: str = os.getenv("MINIO_ARTIFACTS_BUCKET", "audio-artifacts")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_transcribe_model: str = os.getenv(
        "OPENAI_TRANSCRIBE_MODEL", "gpt-4o-transcribe"
    )
    openai_metadata_model: str = os.getenv("OPENAI_METADATA_MODEL", "gpt-5-mini")
    openai_moderation_model: str = os.getenv(
        "OPENAI_MODERATION_MODEL", "omni-moderation-latest"
    )
    dev_logs: bool = os.getenv("WORKER_DEV_LOGS", "false").lower() == "true"


settings = Settings()
