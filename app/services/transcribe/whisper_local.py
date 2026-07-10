"""Local Whisper ASR via HF transformers.

Runs on AMD Instinct MI300X through ROCm (PyTorch/HIP masquerades as CUDA, so the
device string is just "cuda" — no AMD special-casing) and falls back to CPU on a laptop.
We deliberately use `transformers` Whisper rather than faster-whisper because CTranslate2
has no ROCm backend. Heavy deps are imported lazily inside __init__ so the app boots
without them.
"""
from __future__ import annotations

import logging

from app.config import settings
from app.services.types import Transcript, TranscriptSegment

log = logging.getLogger("recipereel.transcribe.whisper")

_PIPELINE = None  # module-level cache so the model loads once per process


def _get_pipeline():
    global _PIPELINE
    if _PIPELINE is not None:
        return _PIPELINE

    import torch  # noqa: PLC0415
    from transformers import pipeline  # noqa: PLC0415

    device = settings.resolve_device()
    dtype = torch.float16 if device == "cuda" else torch.float32
    log.info("Loading Whisper '%s' on %s (%s)", settings.whisper_model, device, dtype)
    _PIPELINE = pipeline(
        "automatic-speech-recognition",
        model=settings.whisper_model,
        torch_dtype=dtype,
        device=0 if device == "cuda" else -1,
        chunk_length_s=30,   # chunking → long-video throughput
        batch_size=16,
    )
    return _PIPELINE


class LocalWhisperTranscriber:
    name = "local-whisper"

    def __init__(self) -> None:
        # Validate torch/transformers are importable up front so build_transcriber()
        # can fall back to mock if they're missing.
        import torch  # noqa: F401,PLC0415
        import transformers  # noqa: F401,PLC0415

        self.name = f"whisper:{settings.whisper_model.split('/')[-1]} ({settings.resolve_device()})"

    def transcribe(self, audio_path: str | None) -> Transcript:
        if not audio_path:
            return Transcript(text="", segments=[], language=None, source="asr")
        asr = _get_pipeline()
        out = asr(audio_path, return_timestamps=True)
        segments: list[TranscriptSegment] = []
        for chunk in out.get("chunks", []) or []:
            ts = chunk.get("timestamp") or (None, None)
            start, end = (ts + (None, None))[:2] if isinstance(ts, tuple) else (None, None)
            segments.append(
                TranscriptSegment(
                    start=float(start or 0.0),
                    end=float(end or (start or 0.0)),
                    text=chunk.get("text", ""),
                )
            )
        text = out.get("text", "") or " ".join(s.text for s in segments)
        return Transcript(text=text, segments=segments, language=None, source="asr")
