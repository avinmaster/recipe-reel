from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field, model_validator

from app.models.enums import STAGE_PROGRESS, JobStage, JobStatus, SourceType


class JobCreate(BaseModel):
    """Request body for creating a recipe-extraction job from a URL."""

    url: str | None = Field(default=None, description="Video URL (YouTube/TikTok/IG/...).")

    @model_validator(mode="after")
    def _require_url(self) -> JobCreate:
        if not self.url or not self.url.strip():
            raise ValueError("A non-empty 'url' is required (or upload a file instead).")
        return self


class JobProgress(BaseModel):
    stage: JobStage = JobStage.queued
    percent: int = 0
    message: str | None = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Job(BaseModel):
    id: str
    status: JobStatus = JobStatus.queued
    source_type: SourceType
    source_ref: str = Field(description="The URL, or the stored filename for uploads.")
    progress: JobProgress = Field(default_factory=JobProgress)
    recipe_id: str | None = None
    error: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def advance(self, stage: JobStage, message: str | None = None) -> Job:
        self.progress = JobProgress(
            stage=stage, percent=STAGE_PROGRESS.get(stage, self.progress.percent), message=message
        )
        if stage == JobStage.failed:
            self.status = JobStatus.failed
        elif stage == JobStage.done:
            self.status = JobStatus.succeeded
        else:
            self.status = JobStatus.running
        self.updated_at = datetime.now(timezone.utc)
        return self
