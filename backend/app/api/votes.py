from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import Vote
from ..schemas import VoteCreate, VoteResponse

router = APIRouter(prefix="/votes", tags=["votes"])


@router.post("", response_model=VoteResponse)
def create_vote(
    payload: VoteCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> VoteResponse:
    vote = Vote(user_id=user.id, audio_id=payload.audio_id)
    db.add(vote)
    db.commit()
    db.refresh(vote)

    return VoteResponse(id=vote.id, audio_id=vote.audio_id, created_at=vote.created_at)

