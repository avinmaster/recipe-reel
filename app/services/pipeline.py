"""End-to-end orchestration: source video → structured Recipe.

Progress is reported via `on_stage`. Every media/ML stage degrades gracefully so the run
never hard-fails on a missing tool: no ffmpeg → empty transcript; no frames → vision skipped;
etc. In MOCK_MODE the media stages are skipped entirely and providers return fixtures.
"""
from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Callable

from app.config import settings
from app.models.enums import JobStage, SourceType
from app.models.recipe import ProcessingStats, Recipe, RecipeContent, SourceMeta
from app.services import audio as audio_svc
from app.services import frames as frames_svc
from app.services import ingest as ingest_svc
from app.services import postprocess
from app.services.synthesize import build_synthesizer
from app.services.transcribe import build_transcriber
from app.services.types import IngestResult, SynthesisContext, Transcript, VisionResult
from app.services.vision import build_vision
from app.utils.hardware import gpu_info

log = logging.getLogger("recipereel.pipeline")

OnStage = Callable[[JobStage, str | None], None]


def run_pipeline(
    *, source_type: SourceType, source_ref: str, on_stage: OnStage
) -> Recipe:
    started = time.monotonic()
    workdir = settings.data_path / "jobs" / uuid.uuid4().hex[:12]
    workdir.mkdir(parents=True, exist_ok=True)

    transcriber = build_transcriber()
    vision = build_vision()
    synthesizer = build_synthesizer()

    ingest: IngestResult
    transcript = Transcript(text="")
    vision_result = VisionResult(frames=[])
    frames: list = []

    if settings.mock_mode:
        # Offline: fabricate source meta, skip all media work.
        on_stage(JobStage.ingesting, "MOCK_MODE — using bundled sample media")
        ingest = _mock_ingest(source_type, source_ref)
    else:
        on_stage(JobStage.ingesting, "Fetching video + metadata")
        ingest = (
            ingest_svc.ingest_url(source_ref, workdir)
            if source_type == SourceType.url
            else ingest_svc.ingest_upload(source_ref)
        )

        on_stage(JobStage.extracting_audio, "Extracting audio")
        audio_path = (
            audio_svc.extract_audio(ingest.video_path, workdir) if ingest.video_path else None
        )
        ingest.audio_path = audio_path

        on_stage(JobStage.sampling_frames, "Sampling keyframes")
        if ingest.video_path:
            frames = frames_svc.sample_keyframes(
                ingest.video_path, workdir / "frames", ingest.source.duration_seconds
            )

    on_stage(JobStage.transcribing, f"Transcribing speech ({transcriber.name})")
    try:
        transcript = transcriber.transcribe(ingest.audio_path if not settings.mock_mode else None)
    except Exception as exc:  # noqa: BLE001
        log.warning("Transcription failed (%s); continuing vision-only.", exc)

    on_stage(JobStage.analyzing_frames, f"Analyzing frames ({vision.name})")
    try:
        vision_result = vision.analyze(frames)
    except Exception as exc:  # noqa: BLE001
        log.warning("Vision failed (%s); continuing transcript-only.", exc)

    if transcript.is_empty and not vision_result.frames:
        raise RuntimeError(
            "No usable signal from the video (no speech and no visual frames). "
            "The video may have no audio and be unreadable, or media tools are missing."
        )

    on_stage(JobStage.synthesizing, f"Writing the recipe ({synthesizer.name})")
    ctx = SynthesisContext(
        source=ingest.source, transcript=transcript, vision=vision_result, frames=frames
    )
    content: RecipeContent = synthesizer.synthesize(ctx)

    on_stage(JobStage.validating, "Normalizing & validating")
    content = postprocess.normalize(content)

    recipe = _assemble(
        content=content,
        source=ingest.source,
        model_used=getattr(synthesizer, "model", synthesizer.name),
        stats=ProcessingStats(
            transcriber=transcriber.name,
            vision=vision.name,
            synthesizer=synthesizer.name,
            device=gpu_info()["device"],
            gpu_name=gpu_info()["gpu_name"],
            rocm_version=gpu_info()["rocm_version"],
            frames_analyzed=len(vision_result.frames),
            transcript_chars=len(transcript.text),
            elapsed_seconds=round(time.monotonic() - started, 2),
        ),
    )
    on_stage(JobStage.done, "Recipe ready")
    return recipe


def _assemble(
    *, content: RecipeContent, source: SourceMeta, model_used: str, stats: ProcessingStats
) -> Recipe:
    return Recipe(
        id=uuid.uuid4().hex,
        source=source,
        model_used=model_used,
        processing=stats,
        **content.model_dump(),
    )


def _mock_ingest(source_type: SourceType, source_ref: str) -> IngestResult:
    source = SourceMeta(
        type=source_type,
        url=source_ref if source_type == SourceType.url else None,
        platform="mock",
        title="One-Pan Garlic Butter Shrimp Pasta (sample)",
        channel="RecipeReel Demo Kitchen",
        duration_seconds=98.0,
    )
    return IngestResult(source=source)
