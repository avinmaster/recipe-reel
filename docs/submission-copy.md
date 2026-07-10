# Paste-ready lablab submission copy — RecipeReel (Track 3)

Copy each block straight into the matching field on the lablab submission form. **You submit it.**

---

## Project Title
```
RecipeReel — from reel to recipe
```

## Short description
```
Turn any cooking video into a perfect, structured recipe: ingredients with real quantities,
step-by-step instructions deep-linked to the exact second, times, equipment, and nutrition —
as clean JSON or schema.org rich-recipe data. Perception runs on AMD MI300X; Gemma reasons.
```

## Long description
```
RecipeReel turns any cooking or tutorial video — a YouTube link, a TikTok, an Instagram Reel,
or an uploaded file — into one clean, structured recipe. You get ingredients with real
quantities, step-by-step instructions that deep-link to the exact moment in the video,
prep/cook/total times, equipment, tips, and an estimated nutrition panel — as validated JSON
or schema.org/Recipe rich-recipe data.

Most "video to recipe" tools only read the transcript, so they miss the amounts — because in
real cooking videos the quantities are shown on screen, not spoken. RecipeReel fuses THREE
signals: Whisper-large-v3 speech recognition and Qwen2.5-VL vision + on-screen-text extraction,
both running on AMD Instinct MI300X GPUs via ROCm, plus Gemma for the structured reasoning
(self-hosted on AMD via vLLM to compete for Best AMD-Hosted Gemma). Quantities are never
invented — an unknown amount is left null, and every field is traceable to what was spoken,
shown, or inferred.

It's a production-shaped FastAPI backend: async jobs with live SSE progress, SQLite
persistence, pluggable providers with graceful CPU/mock fallback, a full REST API, schema.org
export, Docker images (including a ROCm image for the MI300X), a passing test suite, and an
offline mock mode that runs the whole pipeline with zero setup. MIT-licensed, public repo.

Every cooking video is a product waiting to be structured — for home cooks who want to save,
scale, and shop a recipe; for creators who get instant recipe cards and SEO rich results; and
for grocery and commerce, where structured ingredients become a shoppable cart.
```

## Technology & category tags
```
AMD Developer Cloud, AMD ROCm, AMD Instinct MI300X, Gemma, vLLM, Fireworks AI, Whisper,
Qwen2.5-VL, FastAPI, Python, Computer Vision, Multimodal AI, Speech Recognition, Structured Output
```

## Links / hosting fields
- **Public GitHub repository:** https://github.com/avinmaster/recipe-reel
- **Cover image:** screenshot the card at https://claude.ai/code/artifact/25cdd81e-4737-4afe-9519-8002fec49ccd
- **Slide presentation:** export to PDF from https://claude.ai/code/artifact/cc363a5d-4bc7-47e5-8958-5409b8c11945 (browser Print → Save as PDF; each slide prints as one page)
- **Video presentation:** record per `docs/demo-video-script.md` (voiceover required)
- **Demo application URL:** your deployed API's `/docs` (or note the one-command local/pod run)

## One-liner for the cover / tagline
```
Every cooking video, finally machine-readable. Built on AMD.
```
