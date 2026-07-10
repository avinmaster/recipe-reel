from __future__ import annotations

import json
from pathlib import Path

from app.services.types import Frame, FrameAnalysis, VisionResult

_FIXTURE = Path(__file__).resolve().parents[3] / "fixtures" / "sample_vision.json"


class MockVisionAnalyzer:
    """Bundled frame analysis (incl. an on-screen ingredient card) for offline runs."""

    name = "mock"

    def analyze(self, frames: list[Frame]) -> VisionResult:
        if _FIXTURE.exists():
            data = json.loads(_FIXTURE.read_text())
            return VisionResult(
                frames=[
                    FrameAnalysis(
                        index=f["index"],
                        timestamp_seconds=f["timestamp_seconds"],
                        caption=f.get("caption"),
                        on_screen_text=f.get("on_screen_text"),
                    )
                    for f in data.get("frames", [])
                ]
            )
        # Fall back to trivial captions if the fixture is missing.
        return VisionResult(
            frames=[
                FrameAnalysis(index=fr.index, timestamp_seconds=fr.timestamp_seconds, caption="")
                for fr in frames
            ]
        )
