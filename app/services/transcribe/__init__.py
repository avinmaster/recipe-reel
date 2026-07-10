"""Speech-to-text providers. `build_transcriber()` picks one with graceful fallback."""
from __future__ import annotations

import logging

from app.config import TranscriberKind, settings
from app.services.transcribe.base import Transcriber
from app.services.transcribe.mock import MockTranscriber

log = logging.getLogger("recipereel.transcribe")


def build_transcriber() -> Transcriber:
    kind = settings.effective_transcriber()
    if kind == TranscriberKind.mock:
        return MockTranscriber()
    # local (HF transformers Whisper on ROCm/CPU) — imported lazily so the app boots
    # without torch/transformers installed.
    try:
        from app.services.transcribe.whisper_local import LocalWhisperTranscriber

        return LocalWhisperTranscriber()
    except Exception as exc:  # noqa: BLE001
        log.warning("Local Whisper unavailable (%s); falling back to MockTranscriber.", exc)
        return MockTranscriber()


__all__ = ["Transcriber", "MockTranscriber", "build_transcriber"]
