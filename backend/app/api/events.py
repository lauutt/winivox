import asyncio
import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..db import SessionLocal, get_db
from ..deps import get_current_user, get_user_id_from_token
from ..models import AudioSubmission, Event, User
from ..schemas import EventResponse

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=List[EventResponse])
def list_events(
    submission_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> List[EventResponse]:
    query = db.query(Event)

    if submission_id:
        submission = (
            db.query(AudioSubmission)
            .filter(AudioSubmission.id == submission_id, AudioSubmission.user_id == user.id)
            .first()
        )
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        query = query.filter(Event.submission_id == submission_id)
    else:
        submission_ids = (
            db.query(AudioSubmission.id)
            .filter(AudioSubmission.user_id == user.id)
            .all()
        )
        ids = [item[0] for item in submission_ids]
        if not ids:
            return []
        query = query.filter(Event.submission_id.in_(ids))

    events = query.order_by(Event.timestamp.desc()).limit(100).all()
    return [
        EventResponse(
            id=e.id,
            event_name=e.event_name,
            submission_id=e.submission_id,
            timestamp=e.timestamp,
            payload=_sanitize_payload(e.payload),
        )
        for e in events
    ]


@router.get("/stream")
async def stream_events(
    token: str = Query(..., description="Access token for SSE auth"),
    submission_id: Optional[str] = None,
    since: Optional[str] = None,
) -> StreamingResponse:
    user_id = get_user_id_from_token(token)

    with SessionLocal() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if submission_id:
            submission = (
                db.query(AudioSubmission)
                .filter(
                    AudioSubmission.id == submission_id,
                    AudioSubmission.user_id == user_id,
                )
                .first()
            )
            if not submission:
                raise HTTPException(status_code=404, detail="Submission not found")

    since_dt = _parse_since(since)

    async def event_stream():
        last_seen = since_dt or datetime.utcnow()
        yield "retry: 2000\n\n"
        while True:
            events = _fetch_events(user_id, submission_id, last_seen)
            for event in events:
                last_seen = max(last_seen, event.timestamp)
                payload = {
                    "id": event.id,
                    "event_name": event.event_name,
                    "submission_id": event.submission_id,
                    "timestamp": event.timestamp.isoformat(),
                    "payload": _sanitize_payload(event.payload),
                }
                yield _format_sse(payload, event.id)
            yield ": keepalive\n\n"
            await asyncio.sleep(2)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _parse_since(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        cleaned = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(cleaned)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid since timestamp") from exc
    if parsed.tzinfo:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _fetch_events(
    user_id: str, submission_id: Optional[str], since: Optional[datetime]
) -> List[Event]:
    with SessionLocal() as db:
        query = (
            db.query(Event)
            .join(AudioSubmission, Event.submission_id == AudioSubmission.id)
            .filter(AudioSubmission.user_id == user_id)
        )
        if submission_id:
            query = query.filter(Event.submission_id == submission_id)
        if since:
            query = query.filter(Event.timestamp > since)
        return query.order_by(Event.timestamp.asc(), Event.id.asc()).limit(200).all()


def _sanitize_payload(payload: Optional[dict]) -> Optional[dict]:
    if not isinstance(payload, dict):
        return payload
    if "viral_analysis" not in payload:
        return payload
    cleaned = dict(payload)
    cleaned.pop("viral_analysis", None)
    return cleaned


def _format_sse(payload: dict, event_id: Optional[str]) -> str:
    data = json.dumps(payload)
    if event_id:
        return f"id: {event_id}\ndata: {data}\n\n"
    return f"data: {data}\n\n"
