"""Worker webhook (matches infra/worker_payload.py curl target)."""

from __future__ import annotations

import logging
import os
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlmodel import Session

from app.config import get_settings
from app.db import get_session
from app.models import Job, utcnow
from app.schemas import JobStatus, WebhookCompleteRequest, WebhookCompleteResponse

log = logging.getLogger("trainops")

router = APIRouter(tags=["webhook"])


def _verify_webhook_secret(x_webhook_secret: str | None) -> None:
    settings = get_settings()
    if not settings.webhook_secret:
        return
    if x_webhook_secret != settings.webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook secret",
        )


@router.post("/webhook/complete", response_model=WebhookCompleteResponse)
def webhook_complete(
    body: WebhookCompleteRequest,
    db_session: Annotated[Session, Depends(get_session)],
    x_webhook_secret: Annotated[str | None, Header(alias="X-Webhook-Secret")] = None,
) -> WebhookCompleteResponse:
    _verify_webhook_secret(x_webhook_secret)

    settings = get_settings()
    if settings.do_token:
        os.environ["DO_TOKEN"] = settings.do_token

    import do_manager  # noqa: WPS433

    job = db_session.get(Job, body.job_id)
    if job is None:
        log.warning("trainops webhook unknown_job job_id=%s", body.job_id)
        return WebhookCompleteResponse(ok=True)

    if job.status in (JobStatus.Completed.value, JobStatus.Failed.value):
        log.info("trainops webhook idempotent job_id=%s status=%s", body.job_id, job.status)
        return WebhookCompleteResponse(ok=True)

    worker_status = (body.status or "").strip().lower()
    if worker_status == "success":
        job.status = JobStatus.Completed.value
        job.current_step = "Training finished"
        job.weights_url = body.weights_url
        job.error = None
    elif worker_status == "failed":
        job.status = JobStatus.Failed.value
        job.current_step = "Worker failed"
        job.error = body.error or "Worker reported failure"
    else:
        job.status = JobStatus.Failed.value
        job.current_step = "Unknown worker status"
        job.error = f"Unknown worker status: {body.status!r}"

    job.completed_at = utcnow()
    db_session.add(job)
    db_session.commit()

    if job.droplet_id is not None:
        try:
            destroyed = do_manager.destroy_droplet(str(job.droplet_id))
            log.info(
                "trainops webhook destroy job_id=%s droplet_id=%s ok=%s",
                body.job_id,
                job.droplet_id,
                destroyed,
            )
        except Exception:
            log.exception(
                "trainops webhook destroy_failed job_id=%s droplet_id=%s",
                body.job_id,
                job.droplet_id,
            )

    return WebhookCompleteResponse(ok=True)
