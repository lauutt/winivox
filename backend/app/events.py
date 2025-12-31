from datetime import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from .models import Event


def record_event(
    db: Session, event_name: str, submission_id: Optional[str], payload: Any | None
) -> None:
    event = Event(
        event_name=event_name,
        submission_id=submission_id,
        payload=payload,
        timestamp=datetime.utcnow(),
    )
    db.add(event)
    db.commit()

