import os
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from botocore.exceptions import BotoCoreError, ClientError
from redis.exceptions import RedisError
from sqlalchemy.orm import Session

from ..deps import get_current_user
from ..events import record_event
from ..models import AudioSubmission, Event, User, Vote
from ..queue import enqueue_submission
from ..schemas import (
    ImageUploadRequest,
    ImageUploadResponse,
    SubmissionCreate,
    SubmissionResponse,
    SubmissionUploadResponse,
    SubmissionUploadedRequest,
)
from ..settings import settings
from ..storage import generate_presigned_get, generate_presigned_put, get_internal_s3_client
from ..db import get_db

router = APIRouter(prefix="/submissions", tags=["submissions"])

ALLOWED_ANON = {"OFF", "SOFT", "MEDIUM", "STRONG"}


def build_cover_url(submission: AudioSubmission, fallback_key: str | None) -> str | None:
    cover_key = submission.cover_image_key or fallback_key
    if not cover_key:
        return None
    return generate_presigned_get(settings.s3_public_bucket, cover_key)


def build_submission_response(
    submission: AudioSubmission,
    fallback_key: str | None,
) -> SubmissionResponse:
    payload = SubmissionResponse.model_validate(submission).model_dump()
    payload["cover_url"] = build_cover_url(submission, fallback_key)
    return SubmissionResponse(**payload)


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
    if payload.cover_image_key:
        submission.cover_image_key = payload.cover_image_key
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
    return build_submission_response(submission, user.profile_image_key)


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
    return build_submission_response(submission, user.profile_image_key)


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
    return build_submission_response(submission, user.profile_image_key)


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
    return [
        build_submission_response(item, user.profile_image_key) for item in submissions
    ]


@router.post("/{submission_id}/cover", response_model=ImageUploadResponse)
def create_cover_upload(
    submission_id: str,
    payload: ImageUploadRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ImageUploadResponse:
    submission = (
        db.query(AudioSubmission)
        .filter(AudioSubmission.id == submission_id, AudioSubmission.user_id == user.id)
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if not payload.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid image type")

    ext = os.path.splitext(payload.filename)[1] or ".jpg"
    object_key = f"{user.id}/{submission.id}/cover{ext}"
    try:
        upload_url = generate_presigned_put(
            settings.s3_public_bucket, object_key, payload.content_type
        )
    except (BotoCoreError, ClientError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Storage unavailable") from exc

    return ImageUploadResponse(
        upload_url=upload_url,
        upload_method="PUT",
        object_key=object_key,
    )


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

    # Limpiar votos/eventos asociados
    db.query(Vote).filter(Vote.audio_id == submission.id).delete(
        synchronize_session=False
    )
    db.query(Event).filter(Event.submission_id == submission.id).delete(
        synchronize_session=False
    )

    # Eliminar archivos de MinIO (best effort)
    keys_to_delete = [
        (settings.s3_private_bucket, submission.original_audio_key),
        (settings.s3_public_bucket, submission.public_audio_key),
        (settings.s3_public_bucket, submission.cover_image_key),
    ]
    try:
        client = get_internal_s3_client()
        for bucket, key in keys_to_delete:
            if not key:
                continue
            try:
                client.delete_object(Bucket=bucket, Key=key)
            except Exception:
                pass
    except Exception:
        pass  # Ignorar errores de storage

    # Eliminar submission de DB
    db.delete(submission)
    db.commit()

    return {"status": "deleted"}
