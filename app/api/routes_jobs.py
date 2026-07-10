from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, HTTPException, Request, status
from sse_starlette.sse import EventSourceResponse

from app.models.job import Job
from app.store import get_store
from app.worker import get_manager

router = APIRouter(prefix="/api/v1", tags=["jobs"])


def _event(job: Job) -> dict:
    return {
        "job_id": job.id,
        "status": job.status.value,
        "stage": job.progress.stage.value,
        "percent": job.progress.percent,
        "message": job.progress.message,
        "recipe_id": job.recipe_id,
        "error": job.error,
    }


@router.get("/jobs")
def list_jobs(limit: int = 50) -> list[Job]:
    return get_store().list_jobs(limit=limit)


@router.get("/jobs/{job_id}", response_model=Job)
def get_job(job_id: str) -> Job:
    job = get_store().get_job(job_id)
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    return job


@router.get("/jobs/{job_id}/events")
async def job_events(job_id: str, request: Request) -> EventSourceResponse:
    """Server-Sent Events stream of live job progress."""
    store = get_store()
    job = store.get_job(job_id)
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")

    manager = get_manager()

    async def gen():
        current = store.get_job(job_id)
        if current:
            yield {"event": "progress", "data": json.dumps(_event(current))}
            if manager.terminal(current.status.value):
                return
        q = manager.subscribe(job_id)
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(q.get(), timeout=15.0)
                except asyncio.TimeoutError:
                    yield {"event": "ping", "data": "{}"}
                    continue
                yield {"event": "progress", "data": json.dumps(event)}
                if manager.terminal(event.get("status", "")):
                    break
        finally:
            manager.unsubscribe(job_id, q)

    return EventSourceResponse(gen())
