from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth, events, feed, submissions, votes
from .db import Base, engine, ensure_schema
from .schemas import HealthResponse
from .settings import settings

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
    return HealthResponse(status="ok", llm_ready=bool(settings.openai_api_key))


app.include_router(auth.router)
app.include_router(submissions.router)
app.include_router(feed.router)
app.include_router(votes.router)
app.include_router(events.router)
