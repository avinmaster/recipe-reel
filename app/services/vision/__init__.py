"""Vision providers: caption keyframes + read on-screen text (quantities live there)."""
from __future__ import annotations

import logging

from app.config import VisionKind, settings
from app.services.vision.base import NoopVisionAnalyzer, VisionAnalyzer
from app.services.vision.mock import MockVisionAnalyzer

log = logging.getLogger("recipereel.vision")


def build_vision() -> VisionAnalyzer:
    kind = settings.effective_vision()
    if kind == VisionKind.none:
        return NoopVisionAnalyzer()
    if kind == VisionKind.mock:
        return MockVisionAnalyzer()
    if kind == VisionKind.fireworks:
        try:
            from app.services.vision.fireworks import FireworksVisionAnalyzer

            return FireworksVisionAnalyzer()
        except Exception as exc:  # noqa: BLE001
            log.warning("Fireworks vision unavailable (%s); using Noop.", exc)
            return NoopVisionAnalyzer()
    # local (Qwen2.5-VL on ROCm/CPU)
    try:
        from app.services.vision.local_vlm import LocalVLMAnalyzer

        return LocalVLMAnalyzer()
    except Exception as exc:  # noqa: BLE001
        log.warning("Local VLM unavailable (%s); using Noop.", exc)
        return NoopVisionAnalyzer()


__all__ = ["VisionAnalyzer", "NoopVisionAnalyzer", "MockVisionAnalyzer", "build_vision"]
