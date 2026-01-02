from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: EmailStr


class SubmissionCreate(BaseModel):
    filename: str
    content_type: str


class SubmissionUploadResponse(BaseModel):
    id: str
    upload_url: str
    upload_method: str
    object_key: str


class SubmissionUploadedRequest(BaseModel):
    anonymization_mode: str = "SOFT"
    description: Optional[str] = None
    tags_suggested: Optional[List[str]] = None


class SubmissionResponse(BaseModel):
    id: str
    status: str
    processing_step: int
    transcript_preview: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[List[str]] = None
    high_potential: Optional[bool] = None
    moderation_result: Optional[str] = None
    anonymization_mode: str
    description: Optional[str] = None
    tags_suggested: Optional[List[str]] = None
    created_at: datetime
    published_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class FeedItem(BaseModel):
    id: str
    transcript_preview: Optional[str]
    title: Optional[str] = None
    summary: Optional[str]
    tags: Optional[List[str]]
    public_url: str
    published_at: Optional[datetime]
    vote_count: int = 0


class StoryResponse(BaseModel):
    id: str
    title: Optional[str] = None
    summary: Optional[str]
    tags: Optional[List[str]]
    transcript: Optional[str]
    public_url: str
    published_at: Optional[datetime]
    vote_count: int = 0


class VoteCreate(BaseModel):
    audio_id: str


class VoteResponse(BaseModel):
    id: str
    audio_id: str
    created_at: datetime


class HealthResponse(BaseModel):
    status: str
    llm_ready: bool
    db_ready: bool = False
    storage_ready: bool = False
    queue_ready: bool = False


class EventResponse(BaseModel):
    id: Optional[str] = None
    event_name: str
    submission_id: Optional[str] = None
    timestamp: datetime
    payload: Optional[Any]
