"""RecipeReel FastAPI application."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app import __version__
from app.api import routes_captcha, routes_health, routes_jobs, routes_recipes
from app.config import settings
from app.store import get_store
from app.utils.hardware import gpu_info

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)-7s %(name)s | %(message)s",
)
log = logging.getLogger("recipereel")


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_store()  # init DB
    info = gpu_info()
    log.info(
        "%s v%s up | mock=%s | providers: asr=%s vision=%s synth=%s | device=%s gpu=%s",
        settings.app_name, __version__, settings.mock_mode,
        settings.effective_transcriber().value, settings.effective_vision().value,
        settings.effective_synthesizer().value, info["device"], info["gpu_name"],
    )
    yield


app = FastAPI(
    title="RecipeReel API",
    version=__version__,
    summary="Turn any cooking video into a structured recipe.",
    description=(
        "Ingests a cooking video (URL or upload) and returns one structured recipe: "
        "ingredients with quantities, timestamped steps, times, equipment, and nutrition. "
        "Perception (Whisper ASR + Qwen2.5-VL) runs on AMD MI300X/ROCm; recipe synthesis "
        "uses Gemma on Fireworks AI."
    ),
    lifespan=lifespan,
)

# Frontend is built separately — allow it to call us from anywhere in dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_health.router)
app.include_router(routes_captcha.router)
app.include_router(routes_recipes.router)
app.include_router(routes_jobs.router)


# Serve the web UI (JustCook front-end) when present. It's a static, no-build
# SPA under ./web; mounting it lets one process serve the API + UI, and the UI's
# "paste a link" flow can then call this same backend for live extraction.
_WEB_DIR = Path(__file__).resolve().parent.parent / "web"
_HAS_WEB = (_WEB_DIR / "index.html").is_file()
if _HAS_WEB:
    app.mount("/app", StaticFiles(directory=str(_WEB_DIR), html=True), name="web")


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    return RedirectResponse(url="/app/" if _HAS_WEB else "/docs")
