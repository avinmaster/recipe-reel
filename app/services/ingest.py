"""Acquire the source video: download from a URL (yt-dlp) or accept an uploaded file.

Lazy-imports yt-dlp so the app boots without it. Metadata is fetched first (download=False)
to enforce the duration cap before pulling bytes.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from urllib.parse import urlparse

from app.config import settings
from app.models.enums import SourceType
from app.models.recipe import SourceMeta
from app.services.types import IngestResult

log = logging.getLogger("recipereel.ingest")


class IngestError(RuntimeError):
    pass


def _platform_from_url(url: str) -> str | None:
    host = (urlparse(url).hostname or "").lower().removeprefix("www.")
    for key in ("youtube", "youtu.be", "tiktok", "instagram", "facebook", "vimeo", "twitter", "x.com"):
        if key in host:
            return {"youtu.be": "youtube", "x.com": "twitter"}.get(key, key)
    return host or None


def ingest_url(url: str, workdir: Path) -> IngestResult:
    try:
        from yt_dlp import YoutubeDL  # noqa: PLC0415
        from yt_dlp.utils import DownloadError  # noqa: PLC0415
    except Exception as exc:  # noqa: BLE001
        raise IngestError(f"yt-dlp not installed: {exc}") from exc

    workdir.mkdir(parents=True, exist_ok=True)
    common: dict = {"quiet": True, "no_warnings": True, "noplaylist": True}
    # Let yt-dlp solve YouTube's JS / PO-token challenge with a local JS runtime (Node/Deno).
    # This is what makes server-side YouTube downloads work WITHOUT browser cookies or a
    # personal account. Requires `node` (or `deno`) on PATH; harmless if absent.
    common["js_runtimes"] = {"node": {"path": None}, "deno": {"path": None}}
    # Cookies are only needed for login-walled/age-gated content — off by default (a backend
    # shouldn't depend on a personal browser session). Enable via YTDLP_COOKIES_FROM_BROWSER.
    if settings.ytdlp_cookies_from_browser:
        common["cookiesfrombrowser"] = (settings.ytdlp_cookies_from_browser,)

    # 1) metadata only → enforce duration cap before downloading
    try:
        with YoutubeDL(common) as ydl:
            info = ydl.extract_info(url, download=False)
    except DownloadError as exc:
        raise IngestError(f"Could not read video metadata: {exc}") from exc

    duration = info.get("duration")
    if duration and duration > settings.max_video_seconds:
        raise IngestError(
            f"Video is {int(duration)}s; max allowed is {settings.max_video_seconds}s."
        )

    # 2) download a capped-resolution stream (enough for frames + audio)
    dl_opts = {
        **common,
        "format": "bv*[height<=480]+ba/b[height<=480]/best",
        "outtmpl": str(workdir / "source.%(ext)s"),
        "restrictfilenames": True,
        "merge_output_format": "mp4",
    }
    try:
        with YoutubeDL(dl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            video_path = ydl.prepare_filename(info)
    except DownloadError as exc:
        raise IngestError(f"Download failed: {exc}") from exc

    if not os.path.exists(video_path):
        # merge may have changed the extension
        candidates = sorted(workdir.glob("source.*"))
        if not candidates:
            raise IngestError("Downloaded file not found.")
        video_path = str(candidates[0])

    source = SourceMeta(
        type=SourceType.url,
        url=url,
        platform=(info.get("extractor_key") or _platform_from_url(url) or "").lower() or None,
        title=info.get("title"),
        channel=info.get("uploader") or info.get("channel"),
        duration_seconds=float(duration) if duration else None,
        thumbnail_url=info.get("thumbnail"),
    )
    return IngestResult(source=source, video_path=video_path)


def ingest_upload(file_path: str, original_name: str | None = None) -> IngestResult:
    p = Path(file_path)
    if not p.exists():
        raise IngestError(f"Uploaded file not found: {file_path}")
    source = SourceMeta(
        type=SourceType.upload,
        url=None,
        platform="upload",
        title=(original_name or p.name),
        duration_seconds=_probe_duration(file_path),
    )
    return IngestResult(source=source, video_path=str(p))


def _probe_duration(path: str) -> float | None:
    import shutil
    import subprocess

    if not shutil.which("ffprobe"):
        return None
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", path],
            capture_output=True, text=True, timeout=30,
        )
        return float(out.stdout.strip())
    except Exception:  # noqa: BLE001
        return None
