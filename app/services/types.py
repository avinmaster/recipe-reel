"""Intermediate data structures passed between pipeline stages."""
from __future__ import annotations

from dataclasses import dataclass, field

from app.models.recipe import SourceMeta


@dataclass
class IngestResult:
    source: SourceMeta
    audio_path: str | None = None      # extracted/normalized audio (wav)
    video_path: str | None = None      # local video file (for frame sampling)
    caption_text: str | None = None    # platform-provided captions, if any (free ASR)


@dataclass
class TranscriptSegment:
    start: float
    end: float
    text: str

    def stamp(self) -> str:
        m, s = divmod(int(self.start), 60)
        return f"[{m:02d}:{s:02d}]"


@dataclass
class Transcript:
    text: str
    segments: list[TranscriptSegment] = field(default_factory=list)
    language: str | None = None
    source: str = "asr"  # asr | caption | mock

    @property
    def is_empty(self) -> bool:
        return not self.text.strip()

    def timestamped(self, max_chars: int = 12000) -> str:
        """Render as timestamped lines for the synthesis prompt (truncated if huge)."""
        if not self.segments:
            return self.text[:max_chars]
        lines = [f"{seg.stamp()} {seg.text.strip()}" for seg in self.segments if seg.text.strip()]
        out = "\n".join(lines)
        return out[:max_chars]


@dataclass
class Frame:
    index: int
    timestamp_seconds: float
    path: str


@dataclass
class FrameAnalysis:
    index: int
    timestamp_seconds: float
    caption: str | None = None          # what's happening / visible
    on_screen_text: str | None = None   # OCR of overlays (authoritative for quantities)

    def render(self) -> str:
        m, s = divmod(int(self.timestamp_seconds), 60)
        stamp = f"[{m:02d}:{s:02d}]"
        parts = [stamp]
        if self.caption:
            parts.append(self.caption.strip())
        if self.on_screen_text:
            parts.append(f"(on-screen: {self.on_screen_text.strip()})")
        return " ".join(parts)


@dataclass
class VisionResult:
    frames: list[FrameAnalysis] = field(default_factory=list)

    def render(self, max_chars: int = 6000) -> str:
        out = "\n".join(fa.render() for fa in self.frames)
        return out[:max_chars]

    @property
    def has_on_screen_text(self) -> bool:
        return any(fa.on_screen_text for fa in self.frames)


@dataclass
class SynthesisContext:
    """Everything the synthesizer needs to write the recipe."""

    source: SourceMeta
    transcript: Transcript
    vision: VisionResult | None = None
    frames: list[Frame] = field(default_factory=list)  # for multimodal synthesizers
