"""Pydantic API schemas."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl


class ModelName(str, Enum):
    llama_3_8b = "llama-3-8b"
    mistral_7b = "mistral-7b"
    tinyllama_1_1b = "tinyllama-1.1b"


class JobStatus(str, Enum):
    Queued = "Queued"
    Provisioning = "Provisioning"
    Training = "Training"
    Completed = "Completed"
    Failed = "Failed"


class TrainRequest(BaseModel):
    model: ModelName
    dataset_url: HttpUrl
    job_name: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Optional display name; auto-generated if omitted",
    )


class TrainAcceptedResponse(BaseModel):
    job_id: str
    status: JobStatus = JobStatus.Queued
    created_at: datetime


class JobStatusResponse(BaseModel):
    job_id: str
    job_name: str
    model: str
    dataset_url: str
    status: JobStatus
    current_step: Optional[str] = None
    progress: int = Field(ge=0, le=100)
    weights_url: Optional[str] = None
    error: Optional[str] = None
    droplet_id: Optional[int] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class JobListResponse(BaseModel):
    items: list[JobStatusResponse]
    total: int


class WebhookCompleteRequest(BaseModel):
    """Payload sent by infra/worker_payload.py (curl JSON)."""

    job_id: str
    status: str = Field(description='Worker sends "success" or "failed"')
    weights_url: Optional[str] = None
    error: Optional[str] = None


class WebhookCompleteResponse(BaseModel):
    ok: bool = True
