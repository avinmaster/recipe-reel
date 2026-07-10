from __future__ import annotations

from typing import Protocol, runtime_checkable

from app.models.recipe import RecipeContent
from app.services.types import SynthesisContext


@runtime_checkable
class Synthesizer(Protocol):
    name: str

    def synthesize(self, ctx: SynthesisContext) -> RecipeContent:
        """Fuse transcript + vision + metadata into one structured recipe."""
        ...
