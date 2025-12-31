import os
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..deps import get_current_user
from ..events import record_event
from ..models import AudioSubmission, User
from ..queue import enqueue_submission
from ..schemas import (
    SubmissionCreate,
    SubmissionResponse,
    SubmissionUploadResponse,
)
from ..settings import settings
from ..storage import generate_presigned_put
from ..db import get_db

router = APIRouter(prefix="/submissions", tags=["submissions"])

ALLOWED_ANON = {"OFF", "SOFT", "MEDIUM", "STRONG"}


@router.post("", response_model=SubmissionUploadResponse)
def create_submission(
    payload: SubmissionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubmissionUploadResponse:
    if payload.anonymization_mode not in ALLOWED_ANON:
        raise HTTPException(status_code=400, detail="Invalid anonymization mode")

    ext = os.path.splitext(payload.filename)[1] or ".bin"
    submission = AudioSubmission(
        user_id=user.id,
        status="CREATED",
        anonymization_mode=payload.anonymization_mode,
        created_at=datetime.utcnow(),
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    object_key = f"{user.id}/{submission.id}/original{ext}"
    submission.original_audio_key = object_key
    db.commit()

    upload_url = generate_presigned_put(
        settings.s3_private_bucket, object_key, payload.content_type
    )

    return SubmissionUploadResponse(
        id=submission.id,
        upload_url=upload_url,
        upload_method="PUT",
        object_key=object_key,
    )


@router.post("/{submission_id}/uploaded", response_model=SubmissionResponse)
def mark_uploaded(
    submission_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubmissionResponse:
    submission = (
        db.query(AudioSubmission)
        .filter(AudioSubmission.id == submission_id, AudioSubmission.user_id == user.id)
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    submission.status = "UPLOADED"
    submission.processing_step = max(submission.processing_step, 0)
    db.commit()

    record_event(
        db, "audio.uploaded", submission.id, {"object_key": submission.original_audio_key}
    )
    enqueue_submission(submission.id)

    db.refresh(submission)
    return SubmissionResponse.model_validate(submission)


@router.post("/{submission_id}/reprocess", response_model=SubmissionResponse)
def reprocess_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubmissionResponse:
    submission = (
        db.query(AudioSubmission)
        .filter(AudioSubmission.id == submission_id, AudioSubmission.user_id == user.id)
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if not submission.original_audio_key:
        raise HTTPException(status_code=400, detail="Submission has no audio")

    submission.status = "UPLOADED"
    submission.processing_step = 0
    submission.public_audio_key = None
    submission.transcript_preview = None
    submission.summary = None
    submission.tags = None
    submission.moderation_result = None
    submission.published_at = None
    db.commit()

    record_event(db, "audio.reprocess_requested", submission.id, {})
    enqueue_submission(submission.id)

    db.refresh(submission)
    return SubmissionResponse.model_validate(submission)


@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubmissionResponse:
    submission = (
        db.query(AudioSubmission)
        .filter(AudioSubmission.id == submission_id, AudioSubmission.user_id == user.id)
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return SubmissionResponse.model_validate(submission)


@router.get("", response_model=List[SubmissionResponse])
def list_submissions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> List[SubmissionResponse]:
    submissions = (
        db.query(AudioSubmission)
        .filter(AudioSubmission.user_id == user.id)
        .order_by(AudioSubmission.created_at.desc())
        .all()
    )
    return [SubmissionResponse.model_validate(item) for item in submissions]
