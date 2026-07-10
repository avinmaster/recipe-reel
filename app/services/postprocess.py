"""Deterministic cleanup of the LLM's recipe: dedupe, normalize units, fix times/steps."""
from __future__ import annotations

from app.models.recipe import Ingredient, RecipeContent

# Canonical, singular unit forms.
_UNIT_ALIASES = {
    "tablespoon": "tbsp", "tablespoons": "tbsp", "tbsp.": "tbsp", "tbs": "tbsp",
    "teaspoon": "tsp", "teaspoons": "tsp", "tsp.": "tsp",
    "cups": "cup", "c.": "cup",
    "grams": "g", "gram": "g", "gr": "g",
    "kilogram": "kg", "kilograms": "kg",
    "milliliter": "ml", "milliliters": "ml", "millilitre": "ml",
    "liter": "l", "liters": "l", "litre": "l",
    "ounce": "oz", "ounces": "oz", "oz.": "oz",
    "pound": "lb", "pounds": "lb", "lbs": "lb",
    "cloves": "clove", "pinches": "pinch", "slices": "slice", "sprigs": "sprig",
}


def _norm_unit(unit: str | None) -> str | None:
    if not unit:
        return unit
    u = unit.strip().lower()
    return _UNIT_ALIASES.get(u, u)


def _key(ing: Ingredient) -> str:
    return f"{ing.name.strip().lower()}|{(ing.unit or '').strip().lower()}"


def normalize(content: RecipeContent) -> RecipeContent:
    # 1) normalize units
    for ing in content.ingredients:
        ing.unit = _norm_unit(ing.unit)

    # 2) dedupe ingredients (same name+unit) — keep the one with a quantity / richer notes
    merged: dict[str, Ingredient] = {}
    for ing in content.ingredients:
        k = _key(ing)
        if k not in merged:
            merged[k] = ing
            continue
        cur = merged[k]
        if cur.quantity is None and ing.quantity is not None:
            merged[k] = ing
        elif not cur.notes and ing.notes:
            cur.notes = ing.notes
    content.ingredients = list(merged.values())

    # 3) renumber steps sequentially, keep timestamp order if present
    steps = content.steps
    if steps and all(s.start_time_seconds is not None for s in steps):
        steps.sort(key=lambda s: s.start_time_seconds or 0.0)
    for i, s in enumerate(steps, start=1):
        s.number = i

    # 4) compute total time if missing
    if content.total_time_minutes is None:
        prep = content.prep_time_minutes or 0
        cook = content.cook_time_minutes or 0
        if prep or cook:
            content.total_time_minutes = prep + cook

    # 5) clamp confidence
    if content.confidence is not None:
        content.confidence = max(0.0, min(1.0, content.confidence))

    return content
