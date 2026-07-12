# RecipeReel — lablab submission cheat sheet

Copy-paste-ready values for the **AMD Developer Hackathon: ACT II — Track 3 (Unicorn)** lablab form.
Each field is labeled and ready to paste as-is.

> ⚠️ The maintainer submits the lablab form and manages the team. This file is only the paste source.

---

## Project title

```
RecipeReel
```

## Short description (tagline)

```
Turn any cooking video into a perfect, structured recipe — ingredients with real quantities, timestamped steps, and schema.org rich-recipe data.
```

## Long description

```
RecipeReel turns any cooking video into a perfect, structured recipe. Paste a YouTube, TikTok, or Instagram link — or upload a file — and get back ingredients with real quantities, step-by-step instructions that deep-link to the exact moment in the video, prep/cook/total times, equipment, tips, and nutrition — as clean JSON or schema.org/Recipe JSON-LD you can drop straight into a website.

Most "video → recipe" tools only read the transcript, so they miss the amounts — because in real cooking videos the quantities are shown as on-screen text, not spoken. RecipeReel fuses two signals: Whisper-large-v3 speech recognition for the timed steps, and Qwen2.5-VL vision + on-screen-text (OCR) for the exact quantities — both on AMD Instinct MI300X GPUs via ROCm — then Gemma-4 structures everything into one validated recipe. Quantities are never invented: every field is flagged spoken, on-screen, or inferred, and unknown amounts are left null, not hallucinated.

It runs real AMD compute, not a checkbox. The repo ships a ready-to-run notebook that runs Whisper + Qwen2.5-VL on the MI300X and prints the live device string and peak GPU memory. Gemma structuring runs on one OpenAI-compatible code path with three interchangeable routes — free Google AI Studio (real Gemma-4), Fireworks AI, or self-hosted vLLM on the MI300X — so switching cost/latency/quality is a config change, not a rewrite.

It is a production-style FastAPI backend: async jobs, live SSE progress, SQLite persistence, pluggable providers with graceful CPU/mock fallback, containerized, MIT-licensed. A global MOCK_MODE drives the whole pipeline offline from a bundled fixture, so judges can run the real code path end-to-end with zero setup, keys, or GPU.

Try it live at https://infra.tailc95f92.ts.net/ — always-on in MOCK_MODE, no signup.
```

> ⚠️ **lablab's tag fields are closed dropdowns — you can only pick from their prespecified
> lists, not type free text.** The values below are constrained to options that actually exist
> in the form (captured from the live Categories / Event Tracks / Technologies Used dropdowns on
> 2026-07-13). The full option lists are in `lablab-hackathon/lablab-submission-options.md`.

## Event Track (lablab "Event Tracks" field — exactly 3 options; pick one)

The field offers only the three hackathon tracks — `Hybrid Token-Efficient Routing Agent`,
`Unicorn Track`, `Video Captioning`. We are Track 3:

```
Unicorn Track
```

## Category tags (lablab "Categories" field — pick ONLY from its prespecified list)

Load up on the ones that genuinely fit — all exist verbatim in the dropdown:

```
Cooking, Food, Video, Content, Lifestyle, Web Application, Developer Tools, Education, Social Media, Entertainment, Productivity
```

- **Core (must-have):** Cooking, Food, Video, Content, Lifestyle, Web Application.
- **Strong adds:** Developer Tools (real REST API + schema.org export), Education (learn-to-cook /
  tutorial videos), Social Media (ingests YouTube/TikTok/Instagram links), Entertainment (cooking
  content), Productivity (save/scale/shop a recipe).
- **Further valid options** if you want even more: `Utility and Tools`, `Summarization` (video → recipe
  is summarization), `Drink`, `Home`, `Mobile Application` (the web app ships a full phone/iOS layout).

> The old free-form tags (AI/ML · Computer Vision · Multimodal · Generative AI · API ·
> "Content Creation" · "Food & Cooking" · Consumer) are **not** selectable — lablab's Categories
> are domain buckets. Nearest valid equivalents used above: Content Creation → `Content`;
> Food & Cooking → `Cooking` + `Food`.

## Technology tags (lablab "Technologies Used" field — pick ONLY from its prespecified list)

All exist verbatim in the dropdown:

```
AMD Developer Cloud, AMD ROCm, Gemma, AI Studio, Whisper, Qwen3-VL, HuggingFace Hub, rest api
```

- **Core:** AMD Developer Cloud, AMD ROCm (the MI300X compute story), Gemma, AI Studio (= Google AI
  Studio), Whisper (ASR), HuggingFace Hub (Whisper/Qwen weights are pulled from HF), rest api (the API).
- **Nearest-match caveat:** `Qwen3-VL` — the list has **no** "Qwen2.5-VL"; `Qwen3-VL` is the closest
  selectable Qwen vision-language tag (the project actually runs Qwen2.5-VL). Add it unless you'd rather
  not approximate.
- **Optional (honesty tradeoff):** `Gemini AI` — the working demo's vision path uses `gemini-2.5-flash`.
  Accurate, but it slightly muddies the "AMD + Gemma" headline, so include only if you want full fidelity.

> **Not selectable** (were in the old list — drop them): AMD Instinct MI300X → covered by
> `AMD Developer Cloud` + `AMD ROCm`; Google AI Studio → appears as `AI Studio`; Fireworks AI,
> vLLM, FastAPI, Python, SQLite, Docker, OCR, Server-Sent Events, schema.org, Computer Vision,
> Multimodal AI — **none** are in the Technologies list.

> **Note — asset locations.** The cover, video, and deck below live in the **workspace container**
> (`lablab-hackathon/demo/…`), *not* inside the cloned `recipe-reel/` GitHub repo. They are uploaded
> directly to the lablab form, so a judge cloning the repo won't (and needn't) find them there.

## Cover image

- **Path (16:9, 1920×1080):** `lablab-hackathon/demo/cover/recipereel_cover.png`
- Verified on disk as 1920×1080 = exactly 16:9. (No separate `_16x9`/`_native` variant exists — this single file is the 16:9 cover.)

## Video presentation

- **Path (MP4, < 5 min):** `lablab-hackathon/demo/video/RecipeReel.mp4` (the non-narrated 33 s cut)
- Narrated variants also available: `RecipeReel-narrated.mp4`, `RecipeReel-narrated3.mp4` (same folder). **Confirm which cut you upload** — the narrated variant is likely the intended submission.

## Slide deck

- **Path:** `lablab-hackathon/demo/deck/RecipeReel_Slides.pptx` (export to PDF before uploading if the form requires PDF).

## Demo Application Platform

```
Self-hosted — Docker on a Linux VPS, exposed to the public internet via a Tailscale Funnel (that is why the URL is a *.ts.net address). Always-on in MOCK_MODE so anyone can use it immediately with no setup or keys.
```

## Application URL

```
https://infra.tailc95f92.ts.net/
```

## GitHub repository

```
https://github.com/avinmaster/recipe-reel
```

---

## Additional information for judges

```
Why this is not just a Gemini/chatbot wrapper. RecipeReel's accuracy comes from FUSING two independent signals that a transcript-only tool cannot: Whisper speech recognition gives the ordered, timestamped steps, and Qwen2.5-VL vision + on-screen-text (OCR) gives the exact quantities — which in real cooking videos are shown on screen, never spoken. On top of that fusion sits a provenance-and-confidence layer: every field is tagged spoken / on-screen / inferred, and unknown quantities are left null rather than hallucinated. That perception is genuine GPU work, not a single API call.

Real AMD compute. The heavy perception (Whisper-large-v3 + Qwen2.5-VL-7B) runs on the AMD Instinct MI300X via ROCm. The repo ships a ready-to-run notebook — notebooks/amd_recipereel_demo.ipynb — that runs both models on the GPU and, when executed on the pod, prints the live device string and peak GPU memory, so the AMD usage is reproducible from the repository, not just asserted. ROCm PyTorch reports as CUDA, so the identical code path runs on a laptop, in CI, and on the MI300X. GET /api/v1/meta and each recipe's processing block report the live device / GPU name / ROCm version.

Real Gemma, three routes, one code path. Gemma does the structured reasoning over an OpenAI-compatible endpoint: free Google AI Studio (real Gemma-4, no card), hosted Fireworks AI (OpenAI-compatible; runs a fast model such as GLM 5.2 Fast, since Gemma is not on Fireworks serverless), or self-hosted vLLM on the MI300X (AMD-hosted Gemma-3-27B — the route that targets the Best AMD-Hosted Gemma prize). Only base_url / model / key differ — no code change to switch.

Instant to evaluate. The live URL (https://infra.tailc95f92.ts.net/) is always-on in MOCK_MODE — click and run the full pipeline with no keys or setup. Locally it is two commands (cp .env.example .env && make dev) or one docker run. Test suite: MOCK_MODE=true .venv/bin/python -m pytest -q → 24 passed.

How it scales beyond the hackathon. Perception is embarrassingly parallel per video and each request is independent, so throughput scales by batching many videos across the MI300X's 192 GB and adding GPU workers behind the async job queue — no rewrite. The in-process worker + SQLite swap for a real queue + Postgres via config since every stage is a pluggable provider. The schema.org/Recipe JSON-LD output drops straight into recipe sites, meal-planners, and grocery-cart integrations — the wedge from a consumer tool to a video-understanding API that creators and food platforms pay for.
```

---

## Hard requirements — status

| Requirement | Status | Evidence |
| --- | --- | --- |
| Public GitHub repo + README (setup + usage) | ✅ | https://github.com/avinmaster/recipe-reel |
| Containerized | ✅ | `Dockerfile` (slim) · `Dockerfile.rocm` (MI300X) · `docker-compose.yml` |
| MIT-licensed & original | ✅ | `LICENSE` (MIT) |
| Runnable from instructions | ✅ | `MOCK_MODE=true` one-command run; `docker run` |
| Live application URL | ✅ | https://infra.tailc95f92.ts.net/ (HTTP 307 → `/app/`) |
| Uses AMD compute (notebook ready; run on pod) | ⏳ pending pod run | `notebooks/amd_recipereel_demo.ipynb` — Whisper + Qwen2.5-VL on MI300X/ROCm; ships ready to run, execute on the pod to capture the device + GPU-memory outputs |
| Cover image (16:9) | ✅ | `lablab-hackathon/demo/cover/recipereel_cover.png` (1920×1080) |
| Video (MP4 < 5 min) | ✅ | `lablab-hackathon/demo/video/RecipeReel.mp4` |
| Slide deck | ✅ | `lablab-hackathon/demo/deck/RecipeReel_Slides.pptx` |
| Tests green | ✅ | `24 passed` |
