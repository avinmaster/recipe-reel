from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.config import settings
from app.models.enums import SourceType
from app.models.job import Job, JobCreate
from app.store import get_store
from app.worker import get_manager

router = APIRouter(prefix="/api/v1", tags=["recipes"])

_ALLOWED_EXT = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v", ".mp3", ".wav", ".m4a"}


@router.post("/recipes", response_model=Job, status_code=status.HTTP_202_ACCEPTED)
async def create_from_url(body: JobCreate) -> Job:
    """Submit a video URL (YouTube/TikTok/Instagram/…). Returns a job to poll."""
    return get_manager().submit(SourceType.url, body.url.strip())  # type: ignore[union-attr]


@router.post("/recipes/upload", response_model=Job, status_code=status.HTTP_202_ACCEPTED)
async def create_from_upload(file: UploadFile = File(...)) -> Job:
    """Submit an uploaded cooking video file. Returns a job to poll."""
    ext = Path(file.filename or "").suffix.lower()
    if ext and ext not in _ALLOWED_EXT:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"Unsupported type: {ext}")

    uploads = settings.data_path / "uploads"
    uploads.mkdir(parents=True, exist_ok=True)
    dest = uploads / f"{uuid.uuid4().hex[:12]}{ext or '.mp4'}"

    limit = settings.max_upload_mb * 1024 * 1024
    size = 0
    with dest.open("wb") as out:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > limit:
                out.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(
                    status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    f"File exceeds {settings.max_upload_mb} MB.",
                )
            out.write(chunk)

    return get_manager().submit(SourceType.upload, str(dest))


@router.get("/recipes")
def list_recipes(limit: int = 50) -> list[dict]:
    """List recipes (compact cards)."""
    recipes = get_store().list_recipes(limit=limit)
    return [
        {
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "cuisine": r.cuisine,
            "total_time_minutes": r.total_time_minutes,
            "servings": r.servings,
            "thumbnail_url": r.source.thumbnail_url if r.source else None,
            "source_url": r.source.url if r.source else None,
            "generated_at": r.generated_at.isoformat(),
        }
        for r in recipes
    ]


@router.get("/recipes/{recipe_id}")
def get_recipe(recipe_id: str) -> dict:
    recipe = get_store().get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recipe not found")
    return recipe.model_dump(mode="json")


@router.get("/recipes/{recipe_id}/schema-org")
def get_recipe_schema_org(recipe_id: str) -> JSONResponse:
    """schema.org/Recipe JSON-LD (drop into a page's <script type='application/ld+json'>)."""
    recipe = get_store().get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recipe not found")
    return JSONResponse(recipe.to_schema_org(), media_type="application/ld+json")
