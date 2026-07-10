"""Recipe synthesis providers. One OpenAI-compatible code path, two real profiles."""
from __future__ import annotations

import logging

from app.config import SynthesizerKind, settings
from app.services.synthesize.base import Synthesizer
from app.services.synthesize.mock import MockSynthesizer

log = logging.getLogger("recipereel.synthesize")


def build_synthesizer() -> Synthesizer:
    kind = settings.effective_synthesizer()
    if kind == SynthesizerKind.mock:
        return MockSynthesizer()
    try:
        from app.services.synthesize.openai_compat import OpenAICompatSynthesizer

        if kind == SynthesizerKind.amd:
            # Gemma served on the MI300X by local vLLM (OpenAI-compatible endpoint).
            return OpenAICompatSynthesizer(
                base_url=settings.amd_llm_base_url,
                api_key=settings.amd_llm_api_key,
                model=settings.amd_llm_model,
                label="amd-vllm-gemma",
            )
        # Default: Gemma via Fireworks AI.
        if not settings.fireworks_ready:
            log.warning("FIREWORKS_API_KEY not set; falling back to MockSynthesizer.")
            return MockSynthesizer()
        return OpenAICompatSynthesizer(
            base_url=settings.fireworks_base_url,
            api_key=settings.fireworks_api_key,
            model=settings.synth_model,
            label="fireworks-gemma",
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("Synthesizer init failed (%s); falling back to MockSynthesizer.", exc)
        return MockSynthesizer()


__all__ = ["Synthesizer", "MockSynthesizer", "build_synthesizer"]
