"""Background job: provision droplet and hand off to worker + webhook."""

from __future__ import annotations

import logging
import os
from sqlmodel import Session

from app.config import get_settings
from app.db import get_engine
from app.models import Job, utcnow
from app.schemas import JobStatus

log = logging.getLogger("trainops")


def _ensure_do_token() -> None:
    settings = get_settings()
    if settings.do_token:
        os.environ["DO_TOKEN"] = settings.do_token


def run_job(job_id: str) -> None:
    """
    After POST /train: Queued -> Provisioning -> Training.
    Completion and droplet teardown happen in POST /webhook/complete.
    """
    _ensure_do_token()
    # do_manager reads DO_TOKEN into module-level HEADERS at import time
    import do_manager  # noqa: WPS433
    from worker_payload import generate_bash_script  # noqa: WPS433

    droplet_id: int | None = None
    engine = get_engine()

    with Session(engine) as session:
        job = session.get(Job, job_id)
        if job is None:
            log.error("trainops orchestrator job_missing job_id=%s", job_id)
            return

        try:
            job.status = JobStatus.Provisioning.value
            job.current_step = "Booting GPU droplet"
            job.started_at = job.started_at or utcnow()
            session.add(job)
            session.commit()
            session.refresh(job)

            settings = get_settings()
            base = settings.public_backend_url.rstrip("/")
            script = generate_bash_script(job_id, base)
            raw_id = do_manager.create_worker_droplet(job_id, script)
            droplet_id = int(raw_id)

            job.droplet_id = droplet_id
            job.status = JobStatus.Training.value
            job.current_step = "Fine-tuning model"
            session.add(job)
            session.commit()
            log.info(
                "trainops orchestrator provisioned job_id=%s droplet_id=%s",
                job_id,
                droplet_id,
            )
        except Exception as e:
            log.exception(
                "trainops orchestrator failed job_id=%s error=%s",
                job_id,
                e,
            )
            with Session(engine) as session:
                j = session.get(Job, job_id)
                if j is not None:
                    j.status = JobStatus.Failed.value
                    j.error = str(e)
                    j.current_step = "Orchestration failed"
                    j.completed_at = utcnow()
                    session.add(j)
                    session.commit()

            if droplet_id is not None:
                try:
                    do_manager.destroy_droplet(str(droplet_id))
                except Exception:
                    log.exception(
                        "trainops orchestrator destroy_after_fail droplet_id=%s",
                        droplet_id,
                    )
