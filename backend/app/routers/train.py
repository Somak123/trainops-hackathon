"""Train and job status endpoints."""

from __future__ import annotations

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlmodel import Session, col, func, select

from app.db import get_session
from app.models import Job, utcnow
from app.schemas import (
    JobListResponse,
    JobStatus,
    JobStatusResponse,
    TrainAcceptedResponse,
    TrainRequest,
)
from app.services.orchestrator import run_job
from app.services.progress import compute_progress

log = logging.getLogger("trainops")

router = APIRouter(tags=["jobs"])


def _job_to_response(job: Job) -> JobStatusResponse:
    return JobStatusResponse(
        job_id=job.job_id,
        job_name=job.job_name,
        model=job.model,
        dataset_url=job.dataset_url,
        status=JobStatus(job.status),
        current_step=job.current_step,
        progress=compute_progress(job.status, job.current_step),
        weights_url=job.weights_url,
        error=job.error,
        droplet_id=job.droplet_id,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
    )


@router.post(
    "/train",
    response_model=TrainAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def create_training_job(
    body: TrainRequest,
    background_tasks: BackgroundTasks,
    db_session: Annotated[Session, Depends(get_session)],
) -> TrainAcceptedResponse:
    job_id = str(uuid.uuid4())
    raw_name = (body.job_name or "").strip()
    job_name = raw_name if raw_name else f"train-{job_id[:8]}"
    dataset_url = str(body.dataset_url)

    job = Job(
        job_id=job_id,
        job_name=job_name,
        model=body.model.value,
        dataset_url=dataset_url,
        status=JobStatus.Queued.value,
        current_step="Queued for orchestration",
        created_at=utcnow(),
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)

    background_tasks.add_task(run_job, job_id)
    log.info("trainops train_accepted job_id=%s model=%s", job_id, body.model.value)

    return TrainAcceptedResponse(
        job_id=job.job_id,
        status=JobStatus(job.status),
        created_at=job.created_at,
    )


@router.get("/status/{job_id}", response_model=JobStatusResponse)
def get_job_status(
    job_id: str,
    db_session: Annotated[Session, Depends(get_session)],
) -> JobStatusResponse:
    job = db_session.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_to_response(job)


@router.get("/jobs", response_model=JobListResponse)
def list_jobs(
    db_session: Annotated[Session, Depends(get_session)],
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> JobListResponse:
    count_stmt = select(func.count()).select_from(Job)
    total = db_session.exec(count_stmt).one()

    stmt = (
        select(Job)
        .order_by(col(Job.created_at).desc())
        .offset(offset)
        .limit(limit)
    )
    rows = db_session.exec(stmt).all()
    return JobListResponse(
        items=[_job_to_response(j) for j in rows],
        total=int(total),
    )
