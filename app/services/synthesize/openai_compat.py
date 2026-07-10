"""Structured recipe synthesis over any OpenAI-compatible chat endpoint.

Used for BOTH profiles:
  • Fireworks AI (Gemma-4) — reliable demo default.
  • AMD-hosted Gemma via local vLLM on MI300X — targets the "Best AMD-Hosted Gemma" prize.
Only base_url / api_key / model differ.

Reliability: request schema-constrained JSON (`response_format: json_schema`), fall back to
`json_object` if the server rejects the schema, and finally to lenient extraction. We do NOT
route through LiteLLM (it silently downgrades json_schema → json_object).
"""
from __future__ import annotations

import json
import logging
from typing import Any

from app.models.recipe import RecipeContent
from app.services.synthesize.prompts import SYSTEM_PROMPT, build_user_prompt
from app.services.types import SynthesisContext

log = logging.getLogger("recipereel.synthesize.openai")


def _schema_hint() -> str:
    """Compact, human-readable field list for the prompt (Fireworks wants the schema described)."""
    return (
        "{title:str, description:str?, cuisine:str?, category:str?, tags:[str], "
        "servings:str?, servings_count:int?, difficulty:'easy'|'medium'|'hard'?, "
        "prep_time_minutes:num?, cook_time_minutes:num?, total_time_minutes:num?, "
        "ingredients:[{name:str, quantity:num?, unit:str?, notes:str?, group:str?, "
        "optional:bool, raw_text:str?, source:'spoken'|'on_screen'|'metadata'|'caption'|"
        "'inferred'|'unknown'}], equipment:[{name:str, notes:str?}], "
        "steps:[{number:int, instruction:str, start_time_seconds:num?, duration_minutes:num?, "
        "temperature:str?, ingredients_used:[str], tip:str?}], tips:[str], "
        "nutrition:{calories:num?, protein_g:num?, carbs_g:num?, fat_g:num?, is_estimate:bool, "
        "basis:str?}?, language:str, confidence:num(0..1)?, warnings:[str]}"
    )


class OpenAICompatSynthesizer:
    def __init__(self, base_url: str, api_key: str, model: str, label: str) -> None:
        from openai import OpenAI  # noqa: PLC0415

        if not api_key:
            raise RuntimeError(f"{label}: missing api key")
        self.model = model
        self.name = f"{label}:{model.split('/')[-1]}"
        self._client = OpenAI(base_url=base_url, api_key=api_key, timeout=120.0, max_retries=2)
        self._schema = RecipeContent.model_json_schema()

    def synthesize(self, ctx: SynthesisContext) -> RecipeContent:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(ctx, _schema_hint())},
        ]
        raw = self._complete(messages)
        return _coerce(raw)

    def _complete(self, messages: list[dict[str, Any]]) -> str:
        formats = [
            {"type": "json_schema", "json_schema": {"name": "Recipe", "schema": self._schema}},
            {"type": "json_object"},
            None,
        ]
        last_err: Exception | None = None
        for rf in formats:
            try:
                kwargs: dict[str, Any] = dict(model=self.model, messages=messages, temperature=0)
                if rf is not None:
                    kwargs["response_format"] = rf
                resp = self._client.chat.completions.create(**kwargs)
                return resp.choices[0].message.content or ""
            except Exception as exc:  # noqa: BLE001
                last_err = exc
                log.warning("synthesis attempt with response_format=%s failed: %s",
                            (rf or {}).get("type") if rf else "none", exc)
        raise RuntimeError(f"All synthesis attempts failed: {last_err}")


def _coerce(raw: str) -> RecipeContent:
    raw = (raw or "").strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw[raw.find("{") :] if "{" in raw else raw
    try:
        return RecipeContent.model_validate_json(raw)
    except Exception:  # noqa: BLE001
        start, end = raw.find("{"), raw.rfind("}")
        if start != -1 and end != -1:
            return RecipeContent.model_validate(json.loads(raw[start : end + 1]))
        raise
