import os
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from botocore.exceptions import BotoCoreError, ClientError
from redis.exceptions import RedisError
from sqlalchemy.orm import Session

from ..deps import get_current_user
from ..events import record_event
from ..models import AudioSubmission, User
from ..queue import enqueue_submission
from ..schemas import (
    SubmissionCreate,
    SubmissionResponse,
    SubmissionUploadResponse,
    SubmissionUploadedRequest,
)
from ..settings import settings
from ..storage import generate_presigned_put, get_internal_s3_client
from ..db import get_db

router = APIRouter(prefix="/submissions", tags=["submissions"])

ALLOWED_ANON = {"OFF", "SOFT", "MEDIUM", "STRONG"}


@router.post("", response_model=SubmissionUploadResponse)
def create_submission(
    payload: SubmissionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubmissionUploadResponse:
    ext = os.path.splitext(payload.filename)[1] or ".bin"
    submission = AudioSubmission(
        user_id=user.id,
        status="CREATED",
        created_at=datetime.utcnow(),
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    object_key = f"{user.id}/{submission.id}/original{ext}"
    submission.original_audio_key = object_key
    db.commit()

    try:
        upload_url = generate_presigned_put(
            settings.s3_private_bucket, object_key, payload.content_type
        )
    except (BotoCoreError, ClientError, ValueError) as exc:
        db.delete(submission)
        db.commit()
        raise HTTPException(
            status_code=502, detail="Storage unavailable"
        ) from exc

    return SubmissionUploadResponse(
        id=submission.id,
        upload_url=upload_url,
        upload_method="PUT",
        object_key=object_key,
    )


@router.post("/{submission_id}/uploaded", response_model=SubmissionResponse)
def mark_uploaded(
    submission_id: str,
    payload: SubmissionUploadedRequest,
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

    # Validar anonymization_mode
    if payload.anonymization_mode not in ALLOWED_ANON:
        raise HTTPException(status_code=400, detail="Invalid anonymization mode")

    # Actualizar submission con datos de configuración
    submission.status = "UPLOADED"
    submission.processing_step = max(submission.processing_step, 0)
    submission.anonymization_mode = payload.anonymization_mode
    submission.description = payload.description
    submission.tags_suggested = payload.tags_suggested
    db.commit()

    record_event(
        db,
        "audio.uploaded",
        submission.id,
        {"object_key": submission.original_audio_key},
    )
    try:
        enqueue_submission(submission.id)
    except RedisError as exc:
        raise HTTPException(status_code=503, detail="Queue unavailable") from exc

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
    submission.title = None
    submission.summary = None
    submission.tags = None
    submission.viral_analysis = None
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


@router.delete("/{submission_id}")
def cancel_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    submission = (
        db.query(AudioSubmission)
        .filter(AudioSubmission.id == submission_id, AudioSubmission.user_id == user.id)
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Solo permitir cancelar si está en CREATED (no procesado todavía)
    if submission.status != "CREATED":
        raise HTTPException(
            status_code=400, detail="Cannot cancel submission in this state"
        )

    # Eliminar archivo de MinIO (best effort)
    if submission.original_audio_key:
        try:
            client = get_internal_s3_client()
            client.delete_object(
                Bucket=settings.s3_private_bucket, Key=submission.original_audio_key
            )
        except Exception:
            pass  # Ignorar errores de eliminación

    # Eliminar submission de DB
    db.delete(submission)
    db.commit()

    record_event(db, "audio.cancelled", submission_id, {})

    return {"status": "cancelled"}
