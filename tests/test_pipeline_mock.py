from __future__ import annotations

from app.models.enums import JobStage, SourceType
from app.services.pipeline import run_pipeline


def test_mock_pipeline_produces_valid_recipe():
    stages: list[str] = []
    recipe = run_pipeline(
        source_type=SourceType.url,
        source_ref="https://youtube.com/watch?v=demo",
        on_stage=lambda s, m: stages.append(s.value),
    )
    # A complete recipe
    assert recipe.title
    assert len(recipe.ingredients) >= 5
    assert len(recipe.steps) >= 3
    assert recipe.total_time_minutes and recipe.total_time_minutes > 0

    # Steps carry video timestamps (the deep-link feature) and are ordered
    ts = [s.start_time_seconds for s in recipe.steps]
    assert all(t is not None for t in ts)
    assert ts == sorted(ts)

    # On-screen quantities survive; to-taste items stay null (no hallucination)
    assert any(i.quantity is not None for i in recipe.ingredients)
    assert any(i.quantity is None for i in recipe.ingredients)

    # Progress reached completion
    assert JobStage.done.value in stages
    assert stages[-1] == JobStage.done.value

    # Provenance / transparency captured
    assert recipe.processing.synthesizer == "mock"
    assert recipe.processing.frames_analyzed >= 1
