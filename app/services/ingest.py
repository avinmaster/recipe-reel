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
    """Acquire a video from a URL, with clean, client-safe errors.

    For YouTube we prefer SocialKit (hosted download that dodges the datacenter-IP bot wall)
    and fall back to yt-dlp; raw extractor errors ("confirm you're not a bot", "format not
    available", …) are never surfaced to the client — they're translated to a friendly
    "temporarily unavailable — please upload" message. A kill-switch
    (``YOUTUBE_INGEST_ENABLED=false``) lets an operator cleanly disable YouTube links.
    """
    url = (url or "").strip()
    _validate_url(url)
    platform = _platform_from_url(url)

    if platform == "youtube" and not settings.youtube_ingest_enabled:
        raise IngestError(
            "YouTube link ingest is temporarily unavailable. Please upload the video file directly."
        )

    if platform == "youtube" and settings.socialkit_api_key:
        try:
            return _ingest_via_socialkit(url, workdir)
        except IngestError as exc:
            log.warning("SocialKit ingest failed (%s); falling back to yt-dlp.", exc)

    try:
        return _ingest_via_ytdlp(url, workdir)
    except IngestError as exc:
        raise IngestError(_friendly_url_error(platform, str(exc))) from exc


def _validate_url(url: str) -> None:
    u = urlparse(url)
    if u.scheme not in ("http", "https") or not u.netloc:
        raise IngestError(
            "That doesn't look like a valid video URL — paste a full link (https://…), "
            "or upload the file directly."
        )


def _friendly_url_error(platform: str | None, raw: str) -> str:
    """Map a raw extractor error to a calm, client-safe message (never leak the bot-wall text)."""
    low = raw.lower()
    where = "YouTube" if platform == "youtube" else "This video"
    if any(s in low for s in ("not a bot", "sign in to confirm", "confirm you", "429", "too many requests")):
        return (
            f"{where} extraction is temporarily unavailable. Please upload the video file directly."
        )
    if "format is not available" in low or "only images are available" in low:
        return "This video's streams can't be downloaded right now. Please upload the file directly."
    if any(s in low for s in ("private video", "members-only", "video unavailable", "removed")):
        return "This video is unavailable (private, removed, or region-restricted)."
    if "age" in low and "restrict" in low or "confirm your age" in low:
        return (
            "This video is age-restricted and can't be fetched automatically. "
            "Please upload the file directly."
        )
    if "max allowed" in low or "is too long" in low:  # our own duration-cap message — keep it
        return raw
    return "Couldn't fetch this video right now. Please try another link or upload the file directly."


def _ingest_via_socialkit(url: str, workdir: Path) -> IngestResult:
    """Resolve + download a YouTube video via SocialKit's hosted download API.

    Prefers full video (mp4 → audio + frames for vision); falls back to audio-only (m4a →
    transcript) when the video exceeds SocialKit's per-file size cap. The bytes are streamed
    from SocialKit's storage, so this works from a blocked datacenter IP.
    """
    import httpx  # noqa: PLC0415

    key = settings.socialkit_api_key
    base = settings.socialkit_base_url.rstrip("/")
    workdir.mkdir(parents=True, exist_ok=True)

    def _resolve(fmt: str) -> dict:
        payload: dict = {"url": url, "format": fmt}
        if fmt == "mp4":
            payload["quality"] = settings.socialkit_quality
        try:
            with httpx.Client(timeout=settings.socialkit_timeout) as client:
                r = client.post(
                    f"{base}/youtube/download",
                    headers={"x-access-key": key, "Content-Type": "application/json"},
                    json=payload,
                )
        except httpx.HTTPError as exc:
            raise IngestError(f"SocialKit request failed: {exc}") from exc
        if r.status_code in (401, 403):
            raise IngestError("SocialKit API key rejected (check SOCIALKIT_API_KEY).")
        if r.status_code == 429:
            raise IngestError("SocialKit quota/rate limit reached.")
        try:
            body = r.json()
        except Exception as exc:  # noqa: BLE001
            raise IngestError(f"SocialKit returned a non-JSON response ({r.status_code}).") from exc
        data = (body or {}).get("data") or {}
        if not body.get("success") or not data.get("downloadUrl"):
            raise IngestError(
                f"SocialKit could not resolve the video: {body.get('error') or 'no download URL'}"
            )
        return data

    try:
        data = _resolve("mp4")
    except IngestError as exc:
        log.info("SocialKit mp4 unavailable (%s); trying audio-only (m4a).", exc)
        data = _resolve("m4a")

    duration = data.get("durationSeconds")
    if duration and duration > settings.max_video_seconds:
        raise IngestError(f"Video is {int(duration)}s; max allowed is {settings.max_video_seconds}s.")

    ext = "mp4" if str(data.get("format", "")).lower() == "mp4" else "m4a"
    dest = workdir / f"source.{ext}"
    try:
        with httpx.Client(timeout=settings.socialkit_timeout, follow_redirects=True) as client:
            with client.stream("GET", data["downloadUrl"]) as resp:
                resp.raise_for_status()
                with open(dest, "wb") as fh:
                    for chunk in resp.iter_bytes(1 << 16):
                        fh.write(chunk)
    except httpx.HTTPError as exc:
        raise IngestError(f"SocialKit file download failed: {exc}") from exc
    if not dest.exists() or dest.stat().st_size == 0:
        raise IngestError("SocialKit download produced an empty file.")

    source = SourceMeta(
        type=SourceType.url,
        url=url,
        platform="youtube",
        title=data.get("title"),
        duration_seconds=float(duration) if duration else None,
        thumbnail_url=data.get("thumbnail"),
    )
    log.info("Ingested via SocialKit (%s, %s).", data.get("format"), data.get("fileSizeMB"))
    return IngestResult(source=source, video_path=str(dest))


def _ingest_via_ytdlp(url: str, workdir: Path) -> IngestResult:
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
    # Route through a proxy when configured. On a datacenter host YouTube bot-walls the IP;
    # a residential/ISP/mobile proxy (value in .env, never in code) presents as a real user
    # and is the reliable unblock without a personal account/cookies.
    if settings.ytdlp_proxy:
        common["proxy"] = settings.ytdlp_proxy
        log.info("Routing yt-dlp ingest through configured proxy.")
    # Cookies are only needed for login-walled/age-gated content — off by default (a backend
    # shouldn't depend on a personal browser session). Enable via YTDLP_COOKIES_FROM_BROWSER.
    if settings.ytdlp_cookies_from_browser:
        common["cookiesfrombrowser"] = (settings.ytdlp_cookies_from_browser,)
    # A cookies.txt file is the reliable unblock on datacenter IPs (no browser present).
    elif settings.ytdlp_cookies_file and os.path.exists(settings.ytdlp_cookies_file):
        common["cookiefile"] = settings.ytdlp_cookies_file
        log.info("Using YouTube cookies file for ingest.")

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
