import os

from fastapi import APIRouter, Depends, HTTPException
from botocore.exceptions import BotoCoreError, ClientError
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import (
    ImageUploadRequest,
    ImageUploadResponse,
    PublicProfileResponse,
    UserProfileResponse,
    UserProfileUpdate,
)
from ..settings import settings
from ..storage import generate_presigned_get, generate_presigned_put

router = APIRouter(prefix="/profile", tags=["profile"])


def _build_profile_response(user: User) -> UserProfileResponse:
    photo_url = None
    if user.profile_image_key:
        photo_url = generate_presigned_get(
            settings.s3_public_bucket, user.profile_image_key
        )
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        bio=user.bio,
        social_links=user.social_links,
        profile_photo_url=photo_url,
    )


def _build_public_profile_response(user: User) -> PublicProfileResponse:
    photo_url = None
    if user.profile_image_key:
        photo_url = generate_presigned_get(
            settings.s3_public_bucket, user.profile_image_key
        )
    return PublicProfileResponse(
        id=user.id,
        bio=user.bio,
        social_links=user.social_links,
        profile_photo_url=photo_url,
    )


@router.get("", response_model=UserProfileResponse)
def get_profile(user: User = Depends(get_current_user)) -> UserProfileResponse:
    return _build_profile_response(user)


@router.get("/public/{user_id}", response_model=PublicProfileResponse)
def get_public_profile(
    user_id: str,
    db: Session = Depends(get_db),
) -> PublicProfileResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Profile not found")
    return _build_public_profile_response(user)


@router.put("", response_model=UserProfileResponse)
def update_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserProfileResponse:
    updates = payload.model_dump(exclude_unset=True)
    if "bio" in updates:
        user.bio = updates["bio"]
    if "social_links" in updates:
        user.social_links = updates["social_links"]
    if "profile_photo_key" in updates:
        user.profile_image_key = updates["profile_photo_key"]
    db.commit()
    db.refresh(user)
    return _build_profile_response(user)


@router.post("/photo", response_model=ImageUploadResponse)
def create_profile_photo_upload(
    payload: ImageUploadRequest,
    user: User = Depends(get_current_user),
) -> ImageUploadResponse:
    if not payload.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid image type")
    ext = os.path.splitext(payload.filename)[1] or ".jpg"
    object_key = f"{user.id}/profile/photo{ext}"
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
