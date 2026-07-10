"""Extract normalized 16 kHz mono WAV from a video for ASR (ffmpeg)."""
from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path

log = logging.getLogger("recipereel.audio")


class AudioError(RuntimeError):
    pass


def extract_audio(video_path: str, out_dir: Path) -> str | None:
    if not shutil.which("ffmpeg"):
        log.warning("ffmpeg not found; skipping audio extraction (transcript will be empty).")
        return None
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "audio.wav"
    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le",
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        str(out_path),
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    except subprocess.TimeoutExpired as exc:
        raise AudioError("Audio extraction timed out.") from exc
    if proc.returncode != 0 or not out_path.exists():
        # A video with no audio track is not fatal — proceed vision-only.
        log.warning("ffmpeg audio extraction failed (rc=%s): %s", proc.returncode, proc.stderr[-500:])
        return None
    return str(out_path)
