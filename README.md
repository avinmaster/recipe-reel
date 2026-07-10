<div align="center">

# 🍳 RecipeReel

### Turn any cooking video into a perfect, structured recipe.

*Built for the [AMD Developer Hackathon: ACT II](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-ii) — Track 3 (Unicorn) · powered by AMD Instinct MI300X + ROCm + Gemma on Fireworks AI.*

</div>

---

RecipeReel watches a cooking or tutorial video — from a **URL** (YouTube, TikTok, Instagram
Reels…) or an **uploaded file** — and gives you back **one clean, structured recipe**:
ingredients with real quantities, ordered steps with the exact **timestamp in the video**,
prep/cook/total times, equipment, tips, and an estimated nutrition panel. As JSON, or as
[schema.org/Recipe](https://schema.org/Recipe) JSON-LD.

No more scrubbing a 12-minute video four times to find how much flour goes in.

## Why it's different

Most "video → recipe" tools only read the **transcript**, so they miss quantities — because
in real cooking videos the amounts are shown as **on-screen text**, not spoken. RecipeReel
**fuses three signals**:

| Signal | Runs on | Gives us |
| --- | --- | --- |
| 🎙️ **Speech** (Whisper-large-v3) | **AMD MI300X · ROCm** | the *steps*, technique, ordering (timestamped) |
| 👁️ **Vision + on-screen text** (Qwen2.5-VL) | **AMD MI300X · ROCm** | the *exact quantities*, ingredients, plating |
| 🧠 **Reasoning** (Gemma 4 on Fireworks AI) | AMD-hosted Fireworks | fuse + structure into one validated recipe |

Heavy perception runs on the **AMD GPU**; the final structured synthesis uses **Gemma**
(competing for the hackathon's *Best AMD-Hosted Gemma Project* prize). Quantities are left
`null` rather than invented, and every field is flagged spoken / on-screen / inferred.

## Quickstart

```bash
cp .env.example .env          # works out of the box; set FIREWORKS_API_KEY for real runs
make dev                      # or: uvicorn app.main:app --reload

# In another shell — extract a recipe (mock mode needs no keys/GPU):
curl -s -X POST localhost:8000/api/v1/recipes \
     -H 'content-type: application/json' \
     -d '{"url":"https://www.youtube.com/watch?v=DEMO"}' | jq
```

Set `MOCK_MODE=true` to run the entire pipeline offline from a bundled fixture — no GPU, no
network, no API key. That's the zero-setup demo path (and how CI runs).

### On the AMD Developer Cloud (MI300X)

```bash
pip install torch torchaudio --index-url https://download.pytorch.org/whl/rocm6.4
pip install -r requirements.txt
apt-get install -y ffmpeg
python -c "import torch; print(torch.cuda.is_available(), torch.version.hip)"  # True 6.4.x
TRANSCRIBER=local VISION=local SYNTHESIZER=fireworks uvicorn app.main:app
```

### Docker

```bash
docker build -t recipereel .
docker run -p 8000:8000 --env-file .env recipereel
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/recipes` | Submit a video URL or file → returns a `job_id` |
| `GET`  | `/api/v1/jobs/{id}` | Job status + progress |
| `GET`  | `/api/v1/jobs/{id}/events` | Live progress (SSE) |
| `GET`  | `/api/v1/recipes/{id}` | The structured recipe |
| `GET`  | `/api/v1/recipes/{id}/schema-org` | schema.org/Recipe JSON-LD |
| `GET`  | `/api/v1/recipes` | List recipes |
| `GET`  | `/health`, `/api/v1/meta` | Health + active providers/GPU |

Interactive docs at `/docs` once running.

## Example output

A real run returns a fully structured recipe — quantities sourced from on-screen text, steps
deep-linked to the video, plus a schema.org export. See
[`docs/examples/recipe.json`](./docs/examples/recipe.json) and
[`docs/examples/recipe.schema-org.json`](./docs/examples/recipe.schema-org.json).

```jsonc
{
  "title": "One-Pan Garlic Butter Shrimp Pasta",
  "total_time_minutes": 20, "servings": "4 servings", "confidence": 0.86,
  "ingredients": [
    { "name": "linguine", "quantity": 12, "unit": "oz", "source": "on_screen" },
    { "name": "salt", "quantity": null, "notes": "to taste", "source": "spoken" }  // never guessed
  ],
  "steps": [
    { "number": 3, "instruction": "Melt butter; add garlic until fragrant.",
      "start_time_seconds": 36.0, "temperature": "medium heat" }   // ← jump to 0:36 in the video
  ],
  "processing": { "transcriber": "...", "vision": "...", "synthesizer": "...", "device": "cuda" }
}
```

## Architecture

```
URL / file ─► ingest (yt-dlp) ─► audio (ffmpeg) ─┬─► ASR  Whisper-large-v3   (MI300X/ROCm)
                                └─► keyframes ────┴─► VLM  Qwen2.5-VL          (MI300X/ROCm)
                                                       │
                              fuse ► Gemma 4 (Fireworks, json_schema) ► validate ► store ► API
```

Every stage is a pluggable provider with a `mock` implementation and CPU fallback, so the
service is **always runnable**. See [`CLAUDE.md`](./CLAUDE.md) for the full design + research notes.

## License

[MIT](./LICENSE) © 2026 Oybek Odilov
