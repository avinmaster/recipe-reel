from __future__ import annotations

from typing import Protocol, runtime_checkable

from app.services.types import Frame, VisionResult


@runtime_checkable
class VisionAnalyzer(Protocol):
    name: str

    def analyze(self, frames: list[Frame]) -> VisionResult:
        """Caption each keyframe and extract on-screen text."""
        ...


class NoopVisionAnalyzer:
    """Vision disabled — pipeline proceeds transcript-only."""

    name = "none"

    def analyze(self, frames: list[Frame]) -> VisionResult:
        return VisionResult(frames=[])
