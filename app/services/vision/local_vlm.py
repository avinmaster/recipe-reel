"""Local vision-language model (Qwen2.5-VL) for keyframe analysis on AMD MI300X (ROCm).

Qwen2.5-VL is Apache-2.0 and non-gated (no license-approval stall mid-hackathon). At ~16-18 GB
in fp16 it's trivial on the MI300X's 192 GB HBM3. Runs on CPU too (slowly) for laptop dev.
Heavy imports are lazy so the app boots without transformers installed.
"""
from __future__ import annotations

import json
import logging

from app.config import settings
from app.services.types import Frame, FrameAnalysis, VisionResult

log = logging.getLogger("recipereel.vision.local")

_MODEL = None
_PROC = None

_PROMPT = (
    "This is a frame from a cooking video. In one or two sentences describe the ingredients, "
    "action, and tools visible. Then, if there is any on-screen text (ingredient card, "
    "quantity, temperature, caption), transcribe it verbatim. "
    'Respond as JSON: {"caption": "...", "on_screen_text": "..."} (empty string if none).'
)


def _load():
    global _MODEL, _PROC
    if _MODEL is not None:
        return _MODEL, _PROC
    import torch  # noqa: PLC0415
    from transformers import AutoProcessor, Qwen2_5_VLForConditionalGeneration  # noqa: PLC0415

    device = settings.resolve_device()
    dtype = torch.float16 if device == "cuda" else torch.float32
    log.info("Loading VLM '%s' on %s", settings.vision_model, device)
    _MODEL = Qwen2_5_VLForConditionalGeneration.from_pretrained(
        settings.vision_model, torch_dtype=dtype, device_map="auto" if device == "cuda" else None
    )
    if device != "cuda":
        _MODEL = _MODEL.to("cpu")
    _PROC = AutoProcessor.from_pretrained(settings.vision_model)
    return _MODEL, _PROC


class LocalVLMAnalyzer:
    name = "local-vlm"

    def __init__(self) -> None:
        import torch  # noqa: F401,PLC0415
        import transformers  # noqa: F401,PLC0415

        self.name = f"qwen-vl ({settings.resolve_device()})"

    def analyze(self, frames: list[Frame]) -> VisionResult:
        if not frames:
            return VisionResult(frames=[])
        model, proc = _load()
        from qwen_vl_utils import process_vision_info  # noqa: PLC0415

        results: list[FrameAnalysis] = []
        for fr in frames:
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": f"file://{fr.path}"},
                        {"type": "text", "text": _PROMPT},
                    ],
                }
            ]
            text = proc.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            image_inputs, video_inputs = process_vision_info(messages)
            inputs = proc(
                text=[text], images=image_inputs, videos=video_inputs,
                padding=True, return_tensors="pt",
            ).to(model.device)
            generated = model.generate(**inputs, max_new_tokens=256)
            trimmed = generated[:, inputs.input_ids.shape[1]:]
            out = proc.batch_decode(
                trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
            )[0]
            caption, ost = _parse(out)
            results.append(
                FrameAnalysis(
                    index=fr.index,
                    timestamp_seconds=fr.timestamp_seconds,
                    caption=caption,
                    on_screen_text=ost,
                )
            )
        return VisionResult(frames=results)


def _parse(raw: str) -> tuple[str | None, str | None]:
    raw = raw.strip()
    try:
        start, end = raw.find("{"), raw.rfind("}")
        if start != -1 and end != -1:
            data = json.loads(raw[start : end + 1])
            cap = (data.get("caption") or "").strip() or None
            ost = (data.get("on_screen_text") or "").strip() or None
            return cap, ost
    except json.JSONDecodeError:
        pass
    return (raw or None), None
