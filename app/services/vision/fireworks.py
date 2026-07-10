"""Vision via Gemma-4 multimodal on Fireworks (OpenAI-compatible image_url parts).

Handy when no local GPU is available: Gemma-4 on Fireworks can both read frames and
help synthesize, so this keeps the whole thing API-only. Prefer the local Qwen2.5-VL
path on the MI300X for the "Use of AMD Platforms" story.
"""
from __future__ import annotations

import base64
import json
import logging
import mimetypes
from pathlib import Path

from app.config import settings
from app.services.types import Frame, FrameAnalysis, VisionResult

log = logging.getLogger("recipereel.vision.fireworks")

_MAX_IMAGES = 30  # Fireworks per-request image cap

_PROMPT = (
    "These are keyframes sampled from a cooking video, given in chronological order. "
    "For EACH frame, describe what is happening (ingredients, action, tools) and "
    "transcribe any on-screen text EXACTLY (ingredient cards, quantities, temperatures, "
    "captions). On-screen text is the authoritative source of quantities. "
    'Respond with ONLY a JSON array; one object per frame in order: '
    '[{"index": <int>, "caption": "<what is visible>", "on_screen_text": "<verbatim overlay text or empty>"}]'
)


def _data_uri(path: str) -> str:
    mime = mimetypes.guess_type(path)[0] or "image/jpeg"
    b = Path(path).read_bytes()
    return f"data:{mime};base64,{base64.b64encode(b).decode()}"


class FireworksVisionAnalyzer:
    name = f"fireworks:{settings.synth_model.split('/')[-1]}"

    def __init__(self) -> None:
        if not settings.fireworks_ready:
            raise RuntimeError("FIREWORKS_API_KEY not set")
        from openai import OpenAI  # noqa: PLC0415

        self._client = OpenAI(
            base_url=settings.fireworks_base_url, api_key=settings.fireworks_api_key
        )

    def analyze(self, frames: list[Frame]) -> VisionResult:
        if not frames:
            return VisionResult(frames=[])
        batch = frames[:_MAX_IMAGES]
        content: list[dict] = [{"type": "text", "text": _PROMPT}]
        for fr in batch:
            content.append(
                {"type": "text", "text": f"Frame index {fr.index} at {fr.timestamp_seconds:.0f}s:"}
            )
            content.append({"type": "image_url", "image_url": {"url": _data_uri(fr.path)}})

        resp = self._client.chat.completions.create(
            model=settings.synth_model,
            messages=[{"role": "user", "content": content}],
            temperature=0,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or "[]"
        analyses = _parse(raw, batch)
        return VisionResult(frames=analyses)


def _parse(raw: str, batch: list[Frame]) -> list[FrameAnalysis]:
    try:
        data = json.loads(raw)
        if isinstance(data, dict):  # some models wrap arrays as {"frames": [...]}
            data = data.get("frames") or data.get("results") or []
    except json.JSONDecodeError:
        log.warning("Vision response was not valid JSON; dropping visual signal.")
        return []
    by_index = {fr.index: fr for fr in batch}
    out: list[FrameAnalysis] = []
    for i, item in enumerate(data if isinstance(data, list) else []):
        idx = item.get("index", batch[i].index if i < len(batch) else i)
        fr = by_index.get(idx) or (batch[i] if i < len(batch) else None)
        ts = fr.timestamp_seconds if fr else 0.0
        out.append(
            FrameAnalysis(
                index=idx,
                timestamp_seconds=ts,
                caption=(item.get("caption") or "").strip() or None,
                on_screen_text=(item.get("on_screen_text") or "").strip() or None,
            )
        )
    return out
