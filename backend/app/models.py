"""SQLModel database models."""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Job(SQLModel, table=True):
    """Fine-tuning job tracked by the control plane."""

    # Named job_id (not id) for compatibility with Pydantic v2 model construction.
    job_id: str = Field(primary_key=True, max_length=36)
    job_name: str = Field(max_length=255)
    model: str = Field(max_length=64)
    dataset_url: str = Field()
    status: str = Field(default="Queued", max_length=32)
    current_step: Optional[str] = Field(default=None)
    droplet_id: Optional[int] = Field(default=None)
    weights_url: Optional[str] = Field(default=None)
    error: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
