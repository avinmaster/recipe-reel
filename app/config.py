"""Application configuration.

All settings come from environment variables (optionally a `.env` file). Every value
has a safe default so the service boots — and the whole pipeline runs in MOCK mode —
with zero configuration. Real providers activate when their config/keys are present.
"""
from __future__ import annotations

import os
from enum import Enum
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class TranscriberKind(str, Enum):
    local = "local"      # HF transformers Whisper (AMD MI300X / ROCm, or CPU)
    none = "none"        # empty transcript (vision-only real runs, no GPU/torch needed)
    mock = "mock"


class VisionKind(str, Enum):
    local = "local"          # Qwen2.5-VL on MI300X / ROCm (or CPU)
    fireworks = "fireworks"  # Gemma-4 multimodal via Fireworks
    none = "none"            # skip vision entirely (transcript-only recipe)
    mock = "mock"


class SynthesizerKind(str, Enum):
    fireworks = "fireworks"  # Gemma-4 via Fireworks AI (reliable demo default)
    amd = "amd"              # Gemma via local vLLM on MI300X (targets AMD-hosted Gemma prize)
    mock = "mock"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", case_sensitive=False
    )

    # ── App ──────────────────────────────────────────────────────────────────
    app_name: str = "RecipeReel"
    env: str = "development"
    log_level: str = "INFO"
    host: str = "0.0.0.0"
    port: int = 8000

    # Global offline switch: every stage uses its mock/fixture impl.
    mock_mode: bool = False

    # ── Fireworks AI (OpenAI-compatible) ─────────────────────────────────────
    fireworks_api_key: str = ""
    fireworks_base_url: str = "https://api.fireworks.ai/inference/v1"
    # Text synthesis model for the Fireworks path. NOTE (verified Jul 2026): Gemma is NOT
    # available on Fireworks serverless / Fire Pass (returns 404) — Fire Pass grants GLM 5.2
    # Fast + Kimi only. For Gemma (and the "Best AMD-Hosted Gemma" prize) use SYNTHESIZER=amd
    # to self-host Gemma on the MI300X via vLLM (amd_llm_model below).
    synth_model: str = "accounts/fireworks/routers/glm-5p2-fast"
    # Multimodal model for VISION=fireworks. No multimodal model is available on Fire Pass, so
    # on this plan use VISION=local (Qwen2.5-VL on the MI300X) or VISION=none instead.
    vision_fireworks_model: str = "accounts/fireworks/routers/glm-5p2-fast"

    # ── AMD-hosted Gemma via local vLLM (OpenAI-compatible) ──────────────────
    amd_llm_base_url: str = "http://localhost:8001/v1"
    amd_llm_model: str = "google/gemma-3-27b-it"
    amd_llm_api_key: str = "EMPTY"  # vLLM ignores the value but the client needs one

    # ── Provider selection ───────────────────────────────────────────────────
    transcriber: TranscriberKind = TranscriberKind.local
    vision: VisionKind = VisionKind.local
    synthesizer: SynthesizerKind = SynthesizerKind.fireworks

    # ── Local models ─────────────────────────────────────────────────────────
    whisper_model: str = "openai/whisper-large-v3"
    vision_model: str = "Qwen/Qwen2.5-VL-7B-Instruct"
    hf_token: str = ""
    device: str = "auto"  # auto | cuda | cpu

    # ── Media / pipeline tuning ──────────────────────────────────────────────
    max_video_seconds: int = 1800
    max_upload_mb: int = 512
    max_keyframes: int = 24
    scene_threshold: float = 27.0
    ytdlp_cookies_from_browser: str = ""

    # ── Storage ──────────────────────────────────────────────────────────────
    data_dir: str = "./data"
    database_url: str = "sqlite:///./data/recipereel.db"

    # ── Derived helpers ──────────────────────────────────────────────────────
    @property
    def data_path(self) -> Path:
        p = Path(self.data_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def sqlite_path(self) -> Path:
        """Filesystem path parsed from a sqlite:/// URL (falls back to data_dir).

        Ensures the parent directory exists so the DB can be created on first boot.
        """
        url = self.database_url
        p = Path(url.replace("sqlite:///", "", 1)) if url.startswith("sqlite:///") else (
            self.data_path / "recipereel.db"
        )
        p.parent.mkdir(parents=True, exist_ok=True)
        return p

    def resolve_device(self) -> str:
        """Return the torch device string, honoring DEVICE and GPU availability.

        Never imports torch unless needed, so the app boots without ML deps.
        """
        if self.device in ("cuda", "cpu"):
            return self.device
        try:
            import torch  # noqa: PLC0415  (lazy: optional dependency)

            return "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            return "cpu"

    @property
    def fireworks_ready(self) -> bool:
        return bool(self.fireworks_api_key)

    def effective_transcriber(self) -> TranscriberKind:
        return TranscriberKind.mock if self.mock_mode else self.transcriber

    def effective_vision(self) -> VisionKind:
        return VisionKind.mock if self.mock_mode else self.vision

    def effective_synthesizer(self) -> SynthesizerKind:
        return SynthesizerKind.mock if self.mock_mode else self.synthesizer


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


# Convenience module-level singleton.
settings = get_settings()

# Make the HF token visible to transformers/hub if provided.
if settings.hf_token and not os.environ.get("HF_TOKEN"):
    os.environ["HF_TOKEN"] = settings.hf_token
