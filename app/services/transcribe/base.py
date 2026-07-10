from __future__ import annotations

from typing import Protocol, runtime_checkable

from app.services.types import Transcript


@runtime_checkable
class Transcriber(Protocol):
    name: str

    def transcribe(self, audio_path: str | None) -> Transcript:
        """Transcribe an audio file into text + timestamped segments."""
        ...


class NoopTranscriber:
    """Returns an empty transcript — for vision-only real runs (no GPU/torch needed)."""

    name = "none"

    def transcribe(self, audio_path: str | None) -> Transcript:
        return Transcript(text="", segments=[], language=None, source="none")
