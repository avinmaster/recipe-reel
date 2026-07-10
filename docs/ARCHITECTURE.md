# Architecture

RecipeReel converts a cooking video into one structured, validated recipe. The design goal is
**meaningful use of AMD compute** for the heavy perception work, with **Gemma** doing the
structured reasoning — while staying runnable anywhere via pluggable providers + a mock mode.

## Pipeline

```
POST /api/v1/recipes {url}  ─┐
POST /api/v1/recipes/upload ─┴─►  Job (queued)  ──►  async worker (thread)
                                                        │
   1. INGEST      yt-dlp: metadata + capped-res video (or the uploaded file)
   2. AUDIO       ffmpeg → 16 kHz mono WAV (+ loudnorm)
   3. FRAMES      ffmpeg → ~24 evenly-spaced keyframes, each with an exact timestamp
   4. ASR         Whisper-large-v3 (transformers)      ── AMD MI300X / ROCm ──┐
   5. VISION      Qwen2.5-VL on keyframes → captions + on-screen text ────────┤ heavy GPU
   6. SYNTHESIZE  Gemma-4 (Fireworks) or Gemma via local vLLM on MI300X       │  work
                  → schema-constrained Recipe JSON (temperature 0)            │
   7. VALIDATE    Pydantic + unit/dedupe/time normalization                   │
   8. PERSIST     SQLite (jobs + recipes)                                     │
                                                                             ─┘
GET /api/v1/jobs/{id}          poll status/progress
GET /api/v1/jobs/{id}/events   live SSE progress
GET /api/v1/recipes/{id}       structured recipe (+ /schema-org for JSON-LD)
```

## Why this split

- **Perception on the GPU.** ASR and VLM frame analysis are the throughput-bound workloads that
  justify an MI300X (192 GB HBM3 fits Whisper-large-v3 + Qwen2.5-VL fp16 resident at once). This
  is the "Use of AMD Platforms" story.
- **Reasoning on Gemma.** Fusing evidence into a clean recipe is a text-reasoning + structured-
  output task. Gemma-4 via Fireworks is reliable and fast; pointing `SYNTHESIZER=amd` at a local
  vLLM-served Gemma on the MI300X makes it *AMD-hosted* Gemma (Track-3 Gemma prize).
- **Fusion beats transcript-only.** Spoken narration gives step *actions/ordering*; on-screen
  text gives exact *quantities* (usually never spoken). Merging both is the accuracy differentiator.

## Provider matrix

| Stage | Providers | Default (MI300X) | Fallback |
| --- | --- | --- | --- |
| Transcribe | `local` (Whisper/transformers), `mock` | `local` (GPU) | CPU → `mock` |
| Vision | `local` (Qwen2.5-VL), `fireworks` (Gemma mm), `none`, `mock` | `local` (GPU) | `none`/`mock` |
| Synthesize | `fireworks`, `amd` (vLLM Gemma), `mock` | `fireworks` or `amd` | `mock` |

Every real provider is lazily imported and wrapped so a missing dependency, key, or GPU
degrades gracefully instead of crashing. `MOCK_MODE=true` forces the whole chain offline
(bundled fixtures) — used for the zero-setup demo and CI.

## Key modules

- `app/services/pipeline.py` — orchestrator + graceful degradation.
- `app/services/{transcribe,vision,synthesize}/` — provider packages, each with a `build_*()` factory.
- `app/models/recipe.py` — `RecipeContent` (LLM schema) + `Recipe` (envelope) + `to_schema_org()`.
- `app/worker.py` — async job manager + SSE fan-out.
- `app/store/store.py` — SQLite persistence.
