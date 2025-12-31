from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import cast, func, or_, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AudioSubmission, Vote
from ..schemas import FeedItem
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
                transcript_preview=item.transcript_preview,
                summary=item.summary,
                tags=item.tags,
                public_url=public_url,
                published_at=item.published_at,
                vote_count=vote_count or 0,
            )
        )

    return response


@router.get("/tags", response_model=List[str])
def get_feed_tags(db: Session = Depends(get_db)) -> List[str]:
    if _is_postgres(db):
        tag_expr = func.jsonb_array_elements_text(cast(AudioSubmission.tags, JSONB))
        stmt = (
            select(func.distinct(func.lower(tag_expr)).label("tag"))
            .where(AudioSubmission.status == "APPROVED")
            .where(AudioSubmission.tags.isnot(None))
        )
        tags = db.execute(stmt).scalars().all()
        return sorted({tag for tag in tags if tag})

    rows = (
        db.query(AudioSubmission.tags)
        .filter(AudioSubmission.status == "APPROVED", AudioSubmission.tags.isnot(None))
        .all()
    )
    tags: List[str] = []
    for row in rows:
        tags.extend(_normalize_tag_list(row[0]))
    return sorted(set(tags))
