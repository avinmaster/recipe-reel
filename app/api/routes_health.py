from __future__ import annotations

from fastapi import APIRouter

from app import __version__
from app.config import settings
from app.utils.hardware import gpu_info, is_amd_gpu

router = APIRouter(tags=["meta"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "app": settings.app_name, "version": __version__}


@router.get("/api/v1/meta")
def meta() -> dict:
    """Active providers + hardware — makes 'Use of AMD Platforms' legible to callers/judges."""
    info = gpu_info()
    return {
        "app": settings.app_name,
        "version": __version__,
        "mock_mode": settings.mock_mode,
        "providers": {
            "transcriber": settings.effective_transcriber().value,
            "vision": settings.effective_vision().value,
            "synthesizer": settings.effective_synthesizer().value,
            "synth_model": settings.synth_model,
        },
        "hardware": {
            "device": info["device"],
            "gpu_name": info["gpu_name"],
            "rocm_version": info["rocm_version"],
            "is_amd_gpu": is_amd_gpu(),
        },
        "fireworks_configured": settings.fireworks_ready,
    }
