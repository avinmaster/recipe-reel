from __future__ import annotations

import json
from pathlib import Path

from app.models.recipe import RecipeContent
from app.services.types import SynthesisContext

_FIXTURE = Path(__file__).resolve().parents[3] / "fixtures" / "sample_recipe.json"


class MockSynthesizer:
    """Returns a complete, hand-authored recipe so the offline demo shows real output.

    It stitches the source title in from the live context when present, so a mock run on a
    real URL still feels responsive.
    """

    name = "mock"

    def synthesize(self, ctx: SynthesisContext) -> RecipeContent:
        content = RecipeContent.model_validate(json.loads(_FIXTURE.read_text()))
        if ctx.source and ctx.source.title:
            content.warnings = list(content.warnings) + [
                "MOCK_MODE: returned a bundled sample recipe (no real inference ran)."
            ]
        return content
