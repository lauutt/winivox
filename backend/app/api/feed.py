import random
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import cast, func, or_, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AudioSubmission, Vote
from ..schemas import FeedItem, StoryResponse
from ..storage import generate_presigned_get
from ..settings import settings

router = APIRouter(prefix="/feed", tags=["feed"])


def parse_tags(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    return [tag.strip().lower() for tag in raw.split(",") if tag.strip()]


def _is_postgres(db: Session) -> bool:
    try:
        bind = db.get_bind()
    except Exception:
        bind = None
    if not bind:
        return False
    return bind.dialect.name == "postgresql"


def _normalize_tag_list(tags: Optional[List[str]]) -> List[str]:
    if not tags:
        return []
    normalized = []
    for tag in tags:
        value = str(tag).strip().lower()
        if value:
            normalized.append(value)
    return normalized


@router.get("", response_model=List[FeedItem])
def get_feed(
    tags: Optional[str] = Query(default=None),
    tag: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> List[FeedItem]:
    tag_list = parse_tags(tags or tag)
    vote_counts = (
        db.query(Vote.audio_id, func.count(Vote.id).label("vote_count"))
        .group_by(Vote.audio_id)
        .subquery()
    )
    query = (
        db.query(AudioSubmission, vote_counts.c.vote_count)
        .outerjoin(vote_counts, AudioSubmission.id == vote_counts.c.audio_id)
        .filter(AudioSubmission.status == "APPROVED")
    )
    use_postgres = _is_postgres(db)
    if tag_list and use_postgres:
        tag_filters = [
            cast(AudioSubmission.tags, JSONB).contains([tag]) for tag in tag_list
        ]
        query = query.filter(AudioSubmission.tags.isnot(None), or_(*tag_filters))

    items = query.order_by(AudioSubmission.published_at.desc()).limit(200).all()
    if tag_list and not use_postgres:
        filtered = []
        for item, vote_count in items:
            tags_normalized = _normalize_tag_list(item.tags)
            if any(tag in tags_normalized for tag in tag_list):
                filtered.append((item, vote_count))
        items = filtered[:50]
    else:
        items = items[:50]

    response: List[FeedItem] = []
    for item, vote_count in items:
        if not item.public_audio_key:
            continue
        public_url = generate_presigned_get(settings.s3_public_bucket, item.public_audio_key)
        response.append(
            FeedItem(
                id=item.id,
                transcript_preview=None,
                title=item.title,
                summary=item.summary,
                tags=item.tags,
                public_url=public_url,
                published_at=item.published_at,
                vote_count=vote_count or 0,
            )
        )

    return response


@router.get("/tags", response_model=List[str])
def get_feed_tags(
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
) -> List[str]:
    if _is_postgres(db):
        tag_expr = func.jsonb_array_elements_text(cast(AudioSubmission.tags, JSONB))
        stmt = (
            select(func.distinct(func.lower(tag_expr)).label("tag"))
            .where(AudioSubmission.status == "APPROVED")
            .where(AudioSubmission.tags.isnot(None))
        )
        tags = [tag for tag in db.execute(stmt).scalars().all() if tag]
        unique_tags = list({tag for tag in tags})
        if len(unique_tags) > limit:
            return random.sample(unique_tags, limit)
        return sorted(unique_tags)

    rows = (
        db.query(AudioSubmission.tags)
        .filter(AudioSubmission.status == "APPROVED", AudioSubmission.tags.isnot(None))
        .all()
    )
    tags: List[str] = []
    for row in rows:
        tags.extend(_normalize_tag_list(row[0]))
    unique_tags = list(set(tags))
    if len(unique_tags) > limit:
        return random.sample(unique_tags, limit)
    return sorted(unique_tags)


@router.get("/low-serendipia", response_model=List[FeedItem])
def get_low_serendipia(
    limit: int = Query(default=6, ge=1, le=50),
    db: Session = Depends(get_db),
) -> List[FeedItem]:
    vote_counts = (
        db.query(Vote.audio_id, func.count(Vote.id).label("vote_count"))
        .group_by(Vote.audio_id)
        .subquery()
    )
    items = (
        db.query(AudioSubmission, vote_counts.c.vote_count)
        .outerjoin(vote_counts, AudioSubmission.id == vote_counts.c.audio_id)
        .filter(
            AudioSubmission.status == "APPROVED",
            AudioSubmission.viral_analysis.isnot(None),
        )
        .order_by(AudioSubmission.viral_analysis.asc(), AudioSubmission.published_at.desc())
        .limit(limit)
        .all()
    )

    response: List[FeedItem] = []
    for item, vote_count in items:
        if not item.public_audio_key:
            continue
        public_url = generate_presigned_get(
            settings.s3_public_bucket, item.public_audio_key
        )
        response.append(
            FeedItem(
                id=item.id,
                transcript_preview=None,
                title=item.title,
                summary=item.summary,
                tags=item.tags,
                public_url=public_url,
                published_at=item.published_at,
                vote_count=vote_count or 0,
            )
        )
    return response


@router.get("/{audio_id}", response_model=StoryResponse)
def get_story(audio_id: str, db: Session = Depends(get_db)) -> StoryResponse:
    vote_counts = (
        db.query(Vote.audio_id, func.count(Vote.id).label("vote_count"))
        .group_by(Vote.audio_id)
        .subquery()
    )
    item = (
        db.query(AudioSubmission, vote_counts.c.vote_count)
        .outerjoin(vote_counts, AudioSubmission.id == vote_counts.c.audio_id)
        .filter(AudioSubmission.status == "APPROVED", AudioSubmission.id == audio_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Story not found")
    submission, vote_count = item
    if not submission.public_audio_key:
        raise HTTPException(status_code=404, detail="Story not found")
    public_url = generate_presigned_get(
        settings.s3_public_bucket, submission.public_audio_key
    )
    return StoryResponse(
        id=submission.id,
        title=submission.title,
        summary=submission.summary,
        tags=submission.tags,
        transcript=submission.transcript_preview,
        public_url=public_url,
        published_at=submission.published_at,
        vote_count=vote_count or 0,
    )
