import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Integer, String, Text

from db import Base


class AudioSubmission(Base):
    __tablename__ = "audio_submissions"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    status = Column(String, nullable=False)
    processing_step = Column(Integer, nullable=False)
    original_audio_key = Column(String, nullable=True)
    public_audio_key = Column(String, nullable=True)
    transcript_preview = Column(Text, nullable=True)
    title = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)
    viral_analysis = Column(Integer, nullable=True)
    moderation_result = Column(String, nullable=True)
    anonymization_mode = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)
    published_at = Column(DateTime, nullable=True)


class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    event_name = Column(String, nullable=False)
    event_version = Column(Integer, default=1, nullable=False)
    submission_id = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    payload = Column(JSON, nullable=True)
