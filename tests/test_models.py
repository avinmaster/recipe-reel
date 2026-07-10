from __future__ import annotations

from app.models.enums import ProvenanceSource, SourceType
from app.models.recipe import (
    Ingredient,
    Nutrition,
    Recipe,
    RecipeContent,
    SourceMeta,
    Step,
)
from app.services.postprocess import normalize


def _recipe(**overrides) -> Recipe:
    defaults = dict(
        title="Test Dish",
        prep_time_minutes=10,
        cook_time_minutes=20,
        ingredients=[Ingredient(name="flour", quantity=2, unit="cup")],
        steps=[Step(number=1, instruction="Mix", start_time_seconds=5.0)],
        nutrition=Nutrition(calories=300, protein_g=10),
    )
    defaults.update(overrides)
    content = RecipeContent(**defaults)
    return Recipe(id="x", source=SourceMeta(type=SourceType.url, url="http://e/x"), **content.model_dump())


def test_iso8601_durations():
    r = _recipe()
    assert r.prep_time_iso == "PT10M"
    assert r.cook_time_iso == "PT20M"
    assert r.total_time_iso == "PT30M"  # computed from prep+cook


def test_iso8601_hours():
    r = _recipe(cook_time_minutes=90)
    assert r.cook_time_iso == "PT1H30M"


def test_schema_org_shape():
    r = _recipe()
    data = r.to_schema_org()
    assert data["@type"] == "Recipe"
    assert data["name"] == "Test Dish"
    assert data["recipeIngredient"] == ["2 cup flour"]
    assert data["recipeInstructions"][0]["@type"] == "HowToStep"
    assert data["totalTime"] == "PT30M"
    assert data["nutrition"]["@type"] == "NutritionInformation"


def test_normalize_dedupes_and_normalizes_units():
    content = RecipeContent(
        title="D",
        ingredients=[
            Ingredient(name="Garlic", unit="cloves", quantity=None),
            Ingredient(name="garlic", unit="clove", quantity=3),  # dupe after unit-normalize
            Ingredient(name="Flour", unit="cups", quantity=2),
        ],
        steps=[
            Step(number=5, instruction="b", start_time_seconds=20.0),
            Step(number=2, instruction="a", start_time_seconds=5.0),
        ],
    )
    out = normalize(content)
    names = sorted(i.name.lower() for i in out.ingredients)
    assert names == ["flour", "garlic"]  # garlic merged
    garlic = next(i for i in out.ingredients if i.name.lower() == "garlic")
    assert garlic.unit == "clove" and garlic.quantity == 3  # kept the one with a quantity
    assert [s.number for s in out.steps] == [1, 2]  # renumbered
    assert out.steps[0].instruction == "a"  # reordered by timestamp


def test_quantity_may_be_null():
    ing = Ingredient(name="salt", quantity=None, unit=None, source=ProvenanceSource.spoken)
    assert ing.quantity is None
