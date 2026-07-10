from __future__ import annotations

import json
from pathlib import Path

from app.services.types import Transcript, TranscriptSegment

_FIXTURE = Path(__file__).resolve().parents[3] / "fixtures" / "sample_transcript.json"


class MockTranscriber:
    """Returns a bundled cooking-video transcript so the pipeline runs fully offline."""

    name = "mock"

    def transcribe(self, audio_path: str | None) -> Transcript:
        data = json.loads(_FIXTURE.read_text())
        segments = [
            TranscriptSegment(start=s["start"], end=s["end"], text=s["text"])
            for s in data.get("segments", [])
        ]
        text = data.get("text") or " ".join(s.text for s in segments)
        return Transcript(
            text=text, segments=segments, language=data.get("language", "en"), source="mock"
        )
