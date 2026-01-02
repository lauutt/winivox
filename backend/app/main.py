from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from botocore.exceptions import BotoCoreError, ClientError
from redis.exceptions import RedisError
from sqlalchemy import text

from .api import auth, events, feed, profile, submissions, votes
from .db import Base, engine, ensure_schema
from .schemas import HealthResponse
from .queue import get_redis_client
from .settings import settings
from .storage import get_internal_s3_client

app = FastAPI(title="Winivox MVP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_schema()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    db_ready = False
    storage_ready = False
    queue_ready = False

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ready = True
    except Exception:
        db_ready = False

    try:
        client = get_internal_s3_client()
        client.list_buckets()
        storage_ready = True
    except (BotoCoreError, ClientError):
        storage_ready = False
    except Exception:
        storage_ready = False

    try:
        client = get_redis_client()
        queue_ready = bool(client.ping())
    except RedisError:
        queue_ready = False
    except Exception:
        queue_ready = False

    return HealthResponse(
        status="ok",
        llm_ready=bool(settings.openai_api_key),
        db_ready=db_ready,
        storage_ready=storage_ready,
        queue_ready=queue_ready,
    )


app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(submissions.router)
app.include_router(feed.router)
app.include_router(votes.router)
app.include_router(events.router)
