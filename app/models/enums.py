from __future__ import annotations

from enum import Enum


class SourceType(str, Enum):
    url = "url"
    upload = "upload"


class ProvenanceSource(str, Enum):
    """Where a piece of information came from — surfaced so users can trust the output."""

    spoken = "spoken"            # said in the narration (transcript)
    on_screen = "on_screen"      # shown as on-screen text (vision/OCR) — authoritative for qty
    metadata = "metadata"        # video title/description
    caption = "caption"          # platform-provided captions/subtitles
    inferred = "inferred"        # model inference / common knowledge
    unknown = "unknown"


class JobStatus(str, Enum):
    queued = "queued"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"


class JobStage(str, Enum):
    """Ordered pipeline stages, used for progress reporting."""

    queued = "queued"
    ingesting = "ingesting"        # yt-dlp / upload handling
    extracting_audio = "extracting_audio"
    sampling_frames = "sampling_frames"
    transcribing = "transcribing"  # Whisper (AMD GPU)
    analyzing_frames = "analyzing_frames"  # VLM (AMD GPU)
    synthesizing = "synthesizing"  # Gemma structured extraction
    validating = "validating"
    done = "done"
    failed = "failed"


# Progress percentage checkpoints per stage (for the UI progress bar).
STAGE_PROGRESS: dict[JobStage, int] = {
    JobStage.queued: 0,
    JobStage.ingesting: 10,
    JobStage.extracting_audio: 25,
    JobStage.sampling_frames: 35,
    JobStage.transcribing: 55,
    JobStage.analyzing_frames: 75,
    JobStage.synthesizing: 90,
    JobStage.validating: 97,
    JobStage.done: 100,
    JobStage.failed: 100,
}
