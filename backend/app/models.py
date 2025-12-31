import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)

from .db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AudioSubmission(Base):
    __tablename__ = "audio_submissions"

    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="CREATED", nullable=False, index=True)
    processing_step = Column(Integer, default=0, nullable=False)
    original_audio_key = Column(String, nullable=True)
    public_audio_key = Column(String, nullable=True)
    transcript_preview = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)
    moderation_result = Column(String, nullable=True)
    anonymization_mode = Column(String, default="SOFT", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    published_at = Column(DateTime, nullable=True)


class Vote(Base):
    __tablename__ = "votes"

    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    audio_id = Column(String, ForeignKey("audio_submissions.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    event_name = Column(String, nullable=False)
    event_version = Column(Integer, default=1, nullable=False)
    submission_id = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    payload = Column(JSON, nullable=True)
