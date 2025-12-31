import os
from dataclasses import dataclass


def _get_env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://winivox:winivox@postgres:5432/winivox",
    )
    redis_url: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    s3_endpoint: str = os.getenv("MINIO_ENDPOINT", "http://minio:9000")
    s3_public_endpoint: str = os.getenv(
        "MINIO_PUBLIC_ENDPOINT", os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
    )
    s3_access_key: str = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    s3_secret_key: str = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    s3_region: str = os.getenv("MINIO_REGION", "us-east-1")
    s3_private_bucket: str = os.getenv("MINIO_PRIVATE_BUCKET", "audio-private")
    s3_public_bucket: str = os.getenv("MINIO_PUBLIC_BUCKET", "audio-public")
    s3_artifacts_bucket: str = os.getenv("MINIO_ARTIFACTS_BUCKET", "audio-artifacts")
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-secret")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_exp_minutes: int = int(
        os.getenv("ACCESS_TOKEN_EXP_MINUTES", "1440")
    )
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")


settings = Settings()
