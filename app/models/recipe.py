"""The Recipe data model — the heart of RecipeReel.

`RecipeContent` is exactly what the LLM produces (its JSON Schema is sent to Gemma for
schema-constrained decoding). `Recipe` wraps it with server-managed envelope fields
(id, source, provenance stats). A `to_schema_org()` serializer emits schema.org/Recipe
JSON-LD for SEO / rich-result compatibility.
"""
from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field

from app.models.enums import ProvenanceSource, SourceType


def _iso8601_duration(minutes: float | None) -> str | None:
    """Convert minutes → ISO-8601 duration (schema.org wants e.g. 'PT1H30M')."""
    if minutes is None or minutes <= 0:
        return None
    total = int(round(minutes))
    h, m = divmod(total, 60)
    out = "PT"
    if h:
        out += f"{h}H"
    if m or not h:
        out += f"{m}M"
    return out


class Ingredient(BaseModel):
    name: str = Field(description="Canonical ingredient name, e.g. 'all-purpose flour'.")
    quantity: float | None = Field(
        default=None,
        description="Numeric amount. MUST be null if the amount is not stated — never guess.",
    )
    unit: str | None = Field(
        default=None, description="Normalized, singular unit, e.g. 'cup', 'g', 'tbsp'."
    )
    notes: str | None = Field(
        default=None, description="Preparation/qualifier, e.g. 'sifted', 'room temperature'."
    )
    group: str | None = Field(
        default=None, description="Sub-recipe grouping, e.g. 'For the sauce'."
    )
    optional: bool = False
    raw_text: str | None = Field(
        default=None, description="Original phrasing as seen/heard, for auditability."
    )
    source: ProvenanceSource = ProvenanceSource.unknown


class Equipment(BaseModel):
    name: str
    notes: str | None = None


class Step(BaseModel):
    number: int
    instruction: str
    start_time_seconds: float | None = Field(
        default=None,
        description="Timestamp in the source video where this step begins (deep-link target).",
    )
    duration_minutes: float | None = None
    temperature: str | None = Field(
        default=None, description="e.g. '180C' / '350F' when stated."
    )
    ingredients_used: list[str] = Field(default_factory=list)
    tip: str | None = None


class Nutrition(BaseModel):
    """Per-serving estimate. Always flagged as an estimate — never presented as measured."""

    calories: float | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None
    fiber_g: float | None = None
    sugar_g: float | None = None
    sodium_mg: float | None = None
    is_estimate: bool = True
    basis: str | None = Field(
        default=None, description="How it was estimated, e.g. 'per-serving from ingredients'."
    )


class RecipeContent(BaseModel):
    """The recipe body the LLM fills in. This model's JSON Schema drives structured output."""

    title: str
    description: str | None = Field(
        default=None, description="One or two appetizing sentences summarizing the dish."
    )
    cuisine: str | None = None
    category: str | None = Field(
        default=None, description="e.g. 'dessert', 'main course', 'breakfast'."
    )
    tags: list[str] = Field(default_factory=list)

    servings: str | None = Field(default=None, description="Human text, e.g. '4 servings'.")
    servings_count: int | None = None
    difficulty: str | None = Field(default=None, description="'easy' | 'medium' | 'hard'.")

    prep_time_minutes: float | None = None
    cook_time_minutes: float | None = None
    total_time_minutes: float | None = None

    ingredients: list[Ingredient] = Field(default_factory=list)
    equipment: list[Equipment] = Field(default_factory=list)
    steps: list[Step] = Field(default_factory=list)
    tips: list[str] = Field(default_factory=list)
    nutrition: Nutrition | None = None

    language: str | None = Field(default="en", description="ISO language code of the recipe.")
    confidence: float | None = Field(
        default=None, ge=0.0, le=1.0, description="Model's overall confidence, 0-1."
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Caveats, e.g. 'quantities inferred', 'no audio detected'.",
    )


class SourceMeta(BaseModel):
    type: SourceType
    url: str | None = None
    platform: str | None = None       # youtube | tiktok | instagram | upload | ...
    title: str | None = None
    channel: str | None = None
    duration_seconds: float | None = None
    thumbnail_url: str | None = None


class ProcessingStats(BaseModel):
    """Transparency panel — what actually ran, so 'Use of AMD Platforms' is legible."""

    transcriber: str | None = None
    vision: str | None = None
    synthesizer: str | None = None
    device: str | None = None          # 'cuda' (MI300X/ROCm) | 'cpu'
    gpu_name: str | None = None
    rocm_version: str | None = None
    frames_analyzed: int = 0
    transcript_chars: int = 0
    elapsed_seconds: float | None = None


class Recipe(RecipeContent):
    """A fully materialized recipe: content + envelope. This is what the API returns."""

    id: str
    source: SourceMeta
    model_used: str | None = None
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processing: ProcessingStats = Field(default_factory=ProcessingStats)

    # ── ISO-8601 duration accessors (schema.org format) ──────────────────────
    @property
    def prep_time_iso(self) -> str | None:
        return _iso8601_duration(self.prep_time_minutes)

    @property
    def cook_time_iso(self) -> str | None:
        return _iso8601_duration(self.cook_time_minutes)

    @property
    def total_time_iso(self) -> str | None:
        total = self.total_time_minutes
        if total is None:
            prep = self.prep_time_minutes or 0
            cook = self.cook_time_minutes or 0
            total = (prep + cook) or None
        return _iso8601_duration(total)

    def to_schema_org(self) -> dict:
        """Emit a schema.org/Recipe JSON-LD object."""
        instructions = [
            {
                "@type": "HowToStep",
                "position": s.number,
                "text": s.instruction,
                **({"name": f"Step {s.number}"}),
            }
            for s in self.steps
        ]
        ingredients = [
            " ".join(
                part
                for part in [
                    _fmt_qty(ing.quantity),
                    ing.unit,
                    ing.name,
                    f"({ing.notes})" if ing.notes else None,
                ]
                if part
            ).strip()
            for ing in self.ingredients
        ]
        data: dict = {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": self.title,
            "description": self.description,
            "recipeCuisine": self.cuisine,
            "recipeCategory": self.category,
            "keywords": ", ".join(self.tags) if self.tags else None,
            "recipeYield": self.servings,
            "prepTime": self.prep_time_iso,
            "cookTime": self.cook_time_iso,
            "totalTime": self.total_time_iso,
            "recipeIngredient": ingredients,
            "recipeInstructions": instructions,
            "tool": [e.name for e in self.equipment] or None,
        }
        if self.source and self.source.thumbnail_url:
            data["image"] = self.source.thumbnail_url
        if self.source and self.source.channel:
            data["author"] = {"@type": "Person", "name": self.source.channel}
        if self.source and self.source.url:
            data["isBasedOn"] = self.source.url
        if self.nutrition:
            n = self.nutrition
            data["nutrition"] = {
                "@type": "NutritionInformation",
                "calories": f"{int(n.calories)} calories" if n.calories else None,
                "proteinContent": f"{n.protein_g} g" if n.protein_g else None,
                "carbohydrateContent": f"{n.carbs_g} g" if n.carbs_g else None,
                "fatContent": f"{n.fat_g} g" if n.fat_g else None,
            }
            data["nutrition"] = {k: v for k, v in data["nutrition"].items() if v is not None}
        # Drop null keys for a clean JSON-LD payload.
        return {k: v for k, v in data.items() if v not in (None, [], "")}


def _fmt_qty(q: float | None) -> str | None:
    if q is None:
        return None
    return str(int(q)) if float(q).is_integer() else str(q)
