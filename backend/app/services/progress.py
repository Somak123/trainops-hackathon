"""Derive UI progress (0–100) from job status and current_step."""

from app.schemas import JobStatus


def compute_progress(status: str, current_step: str | None) -> int:
    """Single source of truth for dashboard progress bar."""
    st = status
    step = (current_step or "").lower()

    if st == JobStatus.Completed.value:
        return 100
    if st == JobStatus.Failed.value:
        return 0

    if st == JobStatus.Queued.value:
        return 5

    if st == JobStatus.Provisioning.value:
        if "droplet" in step or "gpu" in step or "boot" in step:
            return 25
        return 15

    if st == JobStatus.Training.value:
        if "export" in step or "upload" in step:
            return 85
        if "epoch" in step or "fine" in step or "tun" in step:
            return 65
        return 45

    return 0
