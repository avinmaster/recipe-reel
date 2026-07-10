"""Prompt construction for recipe synthesis.

Design (from research): give the model clearly delimited evidence blocks, tell it to
prefer ON-SCREEN TEXT for quantities and the TRANSCRIPT for step actions, forbid inventing
quantities (null instead), and demand schema-conforming JSON. Temperature 0.
"""
from __future__ import annotations

from app.services.types import SynthesisContext

SYSTEM_PROMPT = (
    "You are RecipeReel, an expert culinary editor that reconstructs ONE precise, cookable "
    "recipe from the evidence extracted from a cooking video. You output ONLY a single JSON "
    "object matching the provided Recipe schema — no prose, no markdown.\n\n"
    "Rules:\n"
    "1. Use ONLY the supplied evidence (video metadata, timestamped transcript, on-screen "
    "text, frame captions). Do not invent ingredients or steps that aren't supported.\n"
    "2. NEVER fabricate quantities. If an amount is not stated, set quantity and unit to null. "
    "Prefer ON-SCREEN TEXT for exact quantities (it is authoritative); prefer the TRANSCRIPT "
    "for the actions and ordering of steps.\n"
    "3. Merge duplicate ingredients (an item spoken AND shown on-screen is ONE ingredient — "
    "keep the on-screen quantity). Normalize units to a canonical singular form "
    "(cup, tbsp, tsp, g, kg, ml, l, oz, lb, clove, pinch).\n"
    "4. Order steps by their video timestamp and set each step's start_time_seconds to when it "
    "begins in the video (from the nearest transcript/frame timestamp).\n"
    "5. Fill prep/cook/total time, servings, cuisine, category, equipment, and tips only when "
    "supported. Estimate nutrition per serving from the ingredients and set nutrition.is_estimate "
    "= true. Set an overall confidence in [0,1] and add short warnings for anything uncertain "
    "(e.g. 'quantities inferred from context', 'no audio — vision only')."
)


def build_user_prompt(ctx: SynthesisContext, schema_hint: str) -> str:
    s = ctx.source
    meta_lines = [
        f"Title: {s.title}" if s.title else None,
        f"Channel/Uploader: {s.channel}" if s.channel else None,
        f"Platform: {s.platform}" if s.platform else None,
        f"Duration: {int(s.duration_seconds)}s" if s.duration_seconds else None,
    ]
    metadata = "\n".join(m for m in meta_lines if m) or "(none)"

    transcript_block = ctx.transcript.timestamped() if ctx.transcript else ""
    if not transcript_block.strip():
        transcript_block = "(no speech transcript available)"

    if ctx.vision and ctx.vision.frames:
        vision_block = ctx.vision.render()
    else:
        vision_block = "(no visual analysis available)"

    return (
        "Reconstruct the recipe from the following evidence.\n\n"
        f"===== VIDEO METADATA =====\n{metadata}\n\n"
        f"===== TIMESTAMPED TRANSCRIPT (speech → steps & ordering) =====\n{transcript_block}\n\n"
        f"===== FRAME ANALYSIS (vision → on-screen quantities & plating) =====\n{vision_block}\n\n"
        "===== OUTPUT =====\n"
        "Return ONE JSON object matching this Recipe schema (types shown for guidance):\n"
        f"{schema_hint}\n"
        "Remember: null for unknown quantities; merge duplicates; order steps by timestamp."
    )
