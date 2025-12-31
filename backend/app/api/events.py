from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
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
    return [EventResponse(event_name=e.event_name, timestamp=e.timestamp, payload=e.payload) for e in events]

