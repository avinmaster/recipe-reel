from __future__ import annotations

from typing import Protocol, runtime_checkable

from app.services.types import Transcript


@runtime_checkable
class Transcriber(Protocol):
    name: str

    def transcribe(self, audio_path: str | None) -> Transcript:
        """Transcribe an audio file into text + timestamped segments."""
        ...
