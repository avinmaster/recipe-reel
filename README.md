<div align="center">

# 🍳 RecipeReel

### Turn any cooking video into a perfect, structured recipe.

*Built for the [AMD Developer Hackathon: ACT II](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-ii) — Track 3 (Unicorn) · powered by AMD Instinct MI300X + ROCm + Gemma.*

### ▶ Live demo — **[infra.tailc95f92.ts.net](https://infra.tailc95f92.ts.net/)**

*Always-on, runs in `MOCK_MODE` — click and use it instantly, no signup, no keys, no setup.*

`▶ Live demo` · `MIT licensed` · `24 tests passing` · `Docker-ready` · `MOCK_MODE offline`

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
| 🧠 **Reasoning** (Gemma, self-hosted on **MI300X · vLLM**) | **AMD GPU** | fuse + structure into one validated recipe |

Heavy perception *and* the Gemma reasoning run on the **AMD GPU** on the MI300X path — the
[`notebooks/amd_recipereel_demo.ipynb`](./notebooks/amd_recipereel_demo.ipynb) notebook plus the
local-perception + `SYNTHESIZER=amd` config — and self-hosting Gemma via vLLM competes for the
hackathon's *Best AMD-Hosted Gemma Project* prize. The **always-on live demo above runs in
`MOCK_MODE` on CPU** (no GPU) so anyone can try it instantly; the on-MI300X run is the notebook /
`SYNTHESIZER=amd` path. (A Fireworks fast model such as GLM 5.2 Fast is a drop-in alternative for
the reasoning step.) Quantities are left `null` rather than invented, and every field is flagged
spoken / on-screen / inferred.

## ▶ Live demo & how to run it (for judges)

**Live now: [https://infra.tailc95f92.ts.net/](https://infra.tailc95f92.ts.net/)**

The demo is **self-hosted** — Docker on a Linux VPS, exposed to the public internet via a
**Tailscale Funnel** (that's why the URL is a `*.ts.net` address). It stays **always-on in
`MOCK_MODE`**, so anyone can open it and run the full pipeline immediately — **zero setup, zero
keys, zero GPU**. `MOCK_MODE` is a first-class feature, not a stub: it drives every real stage
(ingest → job worker → SSE progress → synthesis → validation → schema.org export) from a bundled
fixture, so what you click through is the real code path end-to-end. It's also how CI runs.

**Run it locally — two commands:**

```bash
cp .env.example .env          # works out of the box (MOCK_MODE); set keys later for real runs
make dev                      # → http://localhost:8000  (interactive docs at /docs)
```

```bash
# In another shell — extract a recipe (mock mode needs no keys/GPU):
curl -s -X POST localhost:8000/api/v1/recipes \
     -H 'content-type: application/json' \
     -d '{"url":"https://www.youtube.com/watch?v=DEMO"}' | jq
```

**Run it with Docker** (the image defaults to `MOCK_MODE=true`, so this needs no `.env`):

```bash
docker build -t recipereel .
docker run -p 8000:8000 recipereel          # add --env-file .env for real providers
```

## Use of AMD Platforms

RecipeReel puts the **heavy perception on the AMD Instinct MI300X (ROCm)** — that's where the
compute-intensive work actually lives — and uses **Gemma** for the structuring:

| Stage | Model | Runs on |
| --- | --- | --- |
| 🎙️ Speech → timestamped steps | **Whisper-large-v3** | **MI300X · ROCm** |
| 👁️ Vision + on-screen text (OCR) → quantities | **Qwen2.5-VL-7B** | **MI300X · ROCm** |
| 🧠 Fuse + structure → one validated recipe | **Gemma** — Gemma-4 on Google AI Studio · Gemma-3-27B self-hosted on MI300X/vLLM | one code path, three routes (below) |

**Ready-to-run AMD proof.** [`notebooks/amd_recipereel_demo.ipynb`](./notebooks/amd_recipereel_demo.ipynb)
runs Whisper-large-v3 + Qwen2.5-VL on the MI300X and, **when executed on the pod, prints the live
device string and peak GPU memory** and extracts a recipe — actual GPU compute, not a
"hosted-on-AMD" checkbox. ROCm PyTorch reports as CUDA (`torch.cuda.is_available() == True`,
`torch.version.hip` set), so the *identical* code runs on a laptop CPU, in CI, and on the MI300X.
The committed notebook ships **ready to run**; execute it on an MI300X pod to capture the device +
GPU-memory outputs.

**Three interchangeable synthesis routes — ONE OpenAI-compatible code path** (only `base_url` /
`model` / key differ):

1. **Google AI Studio** — free, real **Gemma-4** (`gemma-4-31b-it`), no credit card. Fastest way to see a real per-video recipe.
2. **Fireworks AI** — the fast, reliable **hosted** option (OpenAI-compatible), set through env vars. Gemma is **not** on Fireworks serverless, so this route runs a fast model such as **GLM 5.2 Fast** for the structuring step.
3. **vLLM on the MI300X** (`SYNTHESIZER=amd`) — **AMD-hosted Gemma** (`google/gemma-3-27b-it`), the route that targets the "Best AMD-Hosted Gemma Project" prize.

Because the synthesizer speaks the OpenAI API, switching between them is a config change, not a code
change. Perception (Whisper + Qwen2.5-VL) is local-GPU in all three.

```bash
# On the AMD MI300X pod (perception on-GPU; synthesis via your chosen Gemma route):
pip install torch torchaudio --index-url https://download.pytorch.org/whl/rocm6.4
pip install -r requirements.txt && apt-get install -y ffmpeg
python -c "import torch; print(torch.cuda.is_available(), torch.version.hip)"  # True 6.4.x
TRANSCRIBER=local VISION=local SYNTHESIZER=amd uvicorn app.main:app            # 100%-AMD path
```

`GET /api/v1/meta` and every recipe's `processing` block report the live device / GPU name / ROCm
version, so the AMD usage is legible to callers and judges.

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
[`docs/examples/recipe.json`](./docs/examples/recipe.json),
[`docs/examples/recipe.schema-org.json`](./docs/examples/recipe.schema-org.json), and a recipe
extracted from a **real YouTube video** in
[`docs/examples/recipe-from-youtube.json`](./docs/examples/recipe-from-youtube.json).

> **Verified end-to-end** (Jul 2026): a real YouTube cooking short → Gemini-2.5-flash reads the
> frames → **Gemma-4 writes the recipe**. Server-side YouTube download needs only **Node** on the
> PATH (yt-dlp solves the JS/PO-token challenge) — no browser, no cookies, no personal account.
> System deps: `ffmpeg` + `node` (both preinstalled in the Docker images).

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
                fuse ► Gemma on MI300X (vLLM, json_schema)  ► validate ► store ► API
                       └ or a Fireworks fast model (GLM 5.2) as a drop-in
```

Every stage is a pluggable provider with a `mock` implementation and CPU fallback, so the
service is **always runnable**. See [`CLAUDE.md`](./CLAUDE.md) for the full design + research notes.

## Scaling beyond the hackathon

The architecture is already the productization plan. Perception (Whisper + Qwen2.5-VL) is
**embarrassingly parallel per video** and each request is independent, so throughput scales by
**batching many videos across the MI300X's 192 GB** and adding GPU workers behind the async job
queue — no rewrite. The in-process worker + SQLite store swap for a real queue (Redis/Celery) and
Postgres by changing config, since every stage is already a pluggable provider. Because Gemma
synthesis runs on **one OpenAI-compatible code path**, you dial cost/latency/quality by pointing at
free Google AI Studio, hosted Fireworks, or self-hosted vLLM without touching pipeline code.
Downstream, the **schema.org/Recipe JSON-LD** output drops straight into recipe sites (Google
rich-result eligibility), meal-planners, and grocery-cart integrations — the wedge from a single
consumer tool to a **video-understanding API** creators and food platforms pay for.

## Submission checklist

| Required asset | Where it is |
| --- | --- |
| **Public GitHub repo + README** | [github.com/avinmaster/recipe-reel](https://github.com/avinmaster/recipe-reel) (this repo) |
| **Containerized** | [`Dockerfile`](./Dockerfile) (slim) · [`Dockerfile.rocm`](./Dockerfile.rocm) (MI300X) · [`docker-compose.yml`](./docker-compose.yml) |
| **Live application URL** | [https://infra.tailc95f92.ts.net/](https://infra.tailc95f92.ts.net/) |
| **Demo Application Platform** | Self-hosted — Docker on a Linux VPS, exposed via a Tailscale Funnel |
| **AMD compute (notebook — run on pod)** | [`notebooks/amd_recipereel_demo.ipynb`](./notebooks/amd_recipereel_demo.ipynb) — Whisper + Qwen2.5-VL on MI300X/ROCm; ships ready to run, execute on the pod to capture outputs |
| **Real Gemma** | Gemma structuring — Gemma-4 on Google AI Studio · Gemma-3-27B self-hosted on vLLM/MI300X · GLM 5.2 Fast on Fireworks (one code path) |
| **MIT license** | [`LICENSE`](./LICENSE) |
| **Cover / video / deck** | See [`docs/SUBMISSION.md`](./docs/SUBMISSION.md) (copy-paste cheat sheet for the lablab form) |
| **Tests** | `MOCK_MODE=true .venv/bin/python -m pytest -q` → **24 passed** |

## License

[MIT](./LICENSE) © 2026 Oybek Odilov
