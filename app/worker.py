"""In-process async job manager: queues work, runs the (blocking) pipeline in a thread,
and fans out progress events to SSE subscribers.

A semaphore bounds concurrency (the AMD GPU handles one heavy job well at a time). This is
intentionally lightweight — no external broker — so the service is a single `uvicorn` process.
Swap in Celery/arq later if horizontal scale is needed.
"""
from __future__ import annotations

import asyncio
import logging

from app.models.enums import JobStage, JobStatus, SourceType
from app.models.job import Job
from app.services.pipeline import run_pipeline
from app.store import get_store

log = logging.getLogger("recipereel.worker")

MAX_CONCURRENT_JOBS = 2


class JobManager:
    def __init__(self) -> None:
        self._sem = asyncio.Semaphore(MAX_CONCURRENT_JOBS)
        self._subscribers: dict[str, set[asyncio.Queue]] = {}
        self._tasks: set[asyncio.Task] = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    # ── public API ───────────────────────────────────────────────────────────
    def submit(self, source_type: SourceType, source_ref: str) -> Job:
        import uuid

        self._loop = asyncio.get_running_loop()
        job = Job(id=uuid.uuid4().hex, source_type=source_type, source_ref=source_ref)
        get_store().save_job(job)
        task = asyncio.create_task(self._run(job))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return job

    def subscribe(self, job_id: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._subscribers.setdefault(job_id, set()).add(q)
        return q

    def unsubscribe(self, job_id: str, q: asyncio.Queue) -> None:
        subs = self._subscribers.get(job_id)
        if subs:
            subs.discard(q)
            if not subs:
                self._subscribers.pop(job_id, None)

    # ── internals ─────────────────────────────────────────────────────────────
    async def _run(self, job: Job) -> None:
        async with self._sem:
            store = get_store()

            def on_stage(stage: JobStage, message: str | None) -> None:
                job.advance(stage, message)
                store.save_job(job)
                self._emit(job)

            try:
                recipe = await asyncio.to_thread(
                    run_pipeline,
                    source_type=job.source_type,
                    source_ref=job.source_ref,
                    on_stage=on_stage,
                )
                store.save_recipe(recipe)
                job.recipe_id = recipe.id
                job.advance(JobStage.done, "Recipe ready")
                store.save_job(job)
                self._emit(job)
            except Exception as exc:  # noqa: BLE001
                log.exception("Job %s failed", job.id)
                job.error = str(exc)
                job.advance(JobStage.failed, str(exc))
                store.save_job(job)
                self._emit(job)

    def _emit(self, job: Job) -> None:
        """Push a progress event to all subscribers (thread-safe)."""
        event = {
            "job_id": job.id,
            "status": job.status.value,
            "stage": job.progress.stage.value,
            "percent": job.progress.percent,
            "message": job.progress.message,
            "recipe_id": job.recipe_id,
            "error": job.error,
        }
        subs = list(self._subscribers.get(job.id, ()))
        loop = self._loop
        for q in subs:
            if loop and loop.is_running():
                loop.call_soon_threadsafe(q.put_nowait, event)
            else:  # same-thread fallback
                q.put_nowait(event)

    @staticmethod
    def terminal(status: str) -> bool:
        return status in (JobStatus.succeeded.value, JobStatus.failed.value)


_manager: JobManager | None = None


def get_manager() -> JobManager:
    global _manager
    if _manager is None:
        _manager = JobManager()
    return _manager
