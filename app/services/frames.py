"""Sample keyframes from a video for vision analysis.

Strategy: evenly space up to `max_keyframes` timestamps across the clip and grab one frame
at each via fast input-seek ffmpeg calls. Even spacing gives reliable step coverage and,
crucially, an EXACT timestamp per frame (so recipe steps can deep-link into the video).
"""
from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path

from app.config import settings
from app.services.ingest import _probe_duration
from app.services.types import Frame

log = logging.getLogger("recipereel.frames")


def sample_keyframes(
    video_path: str, out_dir: Path, duration: float | None = None
) -> list[Frame]:
    if not shutil.which("ffmpeg"):
        log.warning("ffmpeg not found; skipping frame sampling (vision disabled).")
        return []
    out_dir.mkdir(parents=True, exist_ok=True)

    dur = duration or _probe_duration(video_path)
    n = max(1, min(settings.max_keyframes, int((dur or 60) // 3) or settings.max_keyframes))
    if dur and dur > 0:
        # skip the very start/end; sample the informative middle
        step = dur / (n + 1)
        timestamps = [round(step * (i + 1), 2) for i in range(n)]
    else:
        timestamps = [float(i * 3) for i in range(n)]  # 1 frame / 3s when duration unknown

    frames: list[Frame] = []
    for i, ts in enumerate(timestamps):
        out_path = out_dir / f"frame_{i:03d}.jpg"
        cmd = [
            "ffmpeg", "-y", "-ss", f"{ts}", "-i", video_path,
            "-frames:v", "1", "-q:v", "3", "-vf", "scale=768:-2",
            str(out_path),
        ]
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        except subprocess.TimeoutExpired:
            continue
        if proc.returncode == 0 and out_path.exists():
            frames.append(Frame(index=i, timestamp_seconds=ts, path=str(out_path)))
    log.info("Sampled %d keyframes from %s", len(frames), video_path)
    return frames
