# CLAUDE.md — RecipeReel

> Project working notes + history for Claude Code. Read this first every session.
> Product working name: **RecipeReel** (rename freely — see "Naming" below).
> One-liner: **Turn any cooking video into a perfect, structured recipe.**

---

## 1. What we're building

A backend that ingests a cooking / tutorial video — from a **URL** (YouTube, TikTok,
Instagram Reels, etc.) or an **uploaded file** — and produces **one clean, structured
recipe**: title, description, cuisine, servings, prep/cook/total time, ingredients with
quantities + units + notes, equipment, ordered step-by-step instructions (each with the
**video timestamp**, duration, and temperature where known), tips, and an estimated
nutrition panel. Output is validated JSON, also exportable as **schema.org/Recipe JSON-LD**.

The killer product details:
- **Per-step video timestamps** → "jump to this moment in the video."
- **Transcript + on-screen-text fusion** → spoken narration gives the *steps*; on-screen
  overlays give the *exact quantities* (which are usually never said aloud). Fusing both is
  the single biggest accuracy win and the thing most existing tools get wrong.
- **Provenance + confidence** → every field is flagged as spoken / on-screen / inferred,
  and quantities are `null` rather than hallucinated when unknown.

Frontend is being built separately by the user; **we focus on the backend + API**.

---

## 2. Hackathon context (the "conditions")

**Event:** AMD Developer Hackathon: ACT II (lablab.ai × AMD × Google DeepMind Gemma).
- URL: https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-ii
- Online. Registration closed Jul 6, 2026 (user registered in time — eligible).
- **Submission deadline: ~Jul 12, 12:00 AM MT (≈ end of Jul 11, 2026).** VERIFY the exact
  local time on the event's "Event Schedule" tab — it's shown in your timezone there.
- Theme: **AI agents / high-performance AI apps on AMD GPUs in the cloud.**
- Compute stack: **AMD Developer Cloud (MI300X GPUs) + ROCm + Fireworks AI API.**

**Tracks:**
- T1 — Hybrid Token-Efficient Routing Agent (leaderboard-scored, Docker).
- T2 — Video Captioning, 4 styles (leaderboard, LLM-judge).
- **T3 — Unicorn Track ← THIS IS US.** "Your idea. AMD infrastructure. No benchmarks —
  build a product/startup." Judged by humans, not a leaderboard.

**T3 judging criteria (design every decision around these):**
1. **Creativity & Originality** — novel approach/behavior.
2. **Product/Market Potential** — is it a compelling, viable startup idea?
3. **Completeness** — how fully realized & functional it is.
4. **Use of AMD Platforms** — how *meaningfully* AMD infra is used.

**Prizes relevant to us:** T3 = $2,500 / $1,500 / $1,000. **PLUS a $2,000 "Best
AMD-Hosted Gemma Project" (Track 3)** from the $6,000 Gemma pool → we deliberately use
**Gemma (via Fireworks)** for recipe synthesis to compete for it.

**Hard submission requirements (ALL tracks):**
- Submit on lablab.ai before the deadline: title, short + long description, tech/category
  tags, **cover image, video presentation, slide deck**, **public GitHub repo w/ README
  (setup + usage)**, demo app platform + application URL.
- **All submissions must be containerized** → we ship a `Dockerfile` (+ compose).
- **Must be original & MIT-licensed** → repo has an MIT `LICENSE`.
- App must be runnable from the provided instructions.

**Team/pod notes:** one AMD GPU pod per registered team; even solo participants must
register a team on lablab.ai to get a pod. Pod usage capped at **8 h / 24 h**. Allow up to
24 h for pod allocation. Errors at notebooks.amd.com/hackathon usually mean "no team yet".

**Competitive scan (read the full ACT II submissions list, Jul 10):** dozens of Track-1
routing agents and Track-2 video-captioners; a few T3 products (CineScribe, LessonForge,
MEIA-LAB, OncoGraph, KAIROS, AdCollage). **No cooking / recipe-extraction project exists**
→ our idea is genuinely novel in this field (good for Creativity & Originality).

### ⚠️ Private vs public repo — IMPORTANT
The user asked for a **private** repo; the hackathon requires a **public** repo at
submission. Plan: **develop private → scrub secrets → flip to public before submitting.**
Never commit `.env` / API keys. `.gitignore` already excludes them.

---

## 3. Architecture

**Guiding split (from research):** put the *heavy perception* on the AMD MI300X GPU (that's
the "Use of AMD Platforms" story), and the *reasoning/structuring* on **Fireworks Gemma**
(reliable, fast, and competes for the Gemma prize).

```
INPUT: URL or uploaded file
  │
  ├─ 1. INGEST        yt-dlp → metadata (title, desc, duration, uploader, thumbnail),
  │                   audio, video; prefer platform captions when present (free ASR).
  │
  ├─ 2. AUDIO         ffmpeg → 16 kHz mono WAV (+ loudnorm).
  ├─ 3. FRAMES        PySceneDetect / ffmpeg → ~15-25 scene-cut keyframes.
  │
  ├─ 4. ASR           Whisper-large-v3 via HF transformers  ── on MI300X GPU (ROCm)
  │                   → transcript + segment timestamps.
  ├─ 5. VISION        Qwen2.5-VL-7B on keyframes            ── on MI300X GPU (ROCm)
  │                   → per-frame captions + on-screen text (OCR). [optional/pluggable]
  │
  ├─ 6. SYNTHESIZE    Fireworks **gemma-4-31b-it**, json_schema structured output.
  │                   Fuse metadata + timestamped transcript + frame captions/OCR
  │                   → ONE Recipe (temperature 0). Prefer on-screen text for quantities,
  │                   transcript for step actions. Never invent quantities (null).
  │
  ├─ 7. VALIDATE      Pydantic v2 validation, ingredient normalization (unit/qty),
  │                   dedupe, compute total time, estimate nutrition (flagged).
  │
  └─ 8. PERSIST+SERVE SQLite job + recipe store; FastAPI REST + SSE progress.
```

**Pluggable providers (all with graceful fallback + a `mock` impl so it runs anywhere):**
- `Transcriber`: `local` (transformers Whisper, ROCm/CPU) · `mock`.
- `VisionAnalyzer`: `local` (Qwen2.5-VL, ROCm/CPU) · `fireworks` (Gemma multimodal) ·
  `none` · `mock`.
- `Synthesizer`: `fireworks` (Gemma via Fireworks) · `amd` (Gemma via **local vLLM on
  MI300X/ROCm**) · `mock`. Both real profiles share ONE OpenAI-compatible code path — only
  `base_url` / `model` / `api_key` differ.

### 🏆 Targeting the Track-3 Gemma prize ("Best AMD-*Hosted* Gemma Project", $2k)
The name says **hosted** — implying Gemma should run on **AMD compute**, not merely be called
via Fireworks. So the strongest submission serves **Gemma on the MI300X via vLLM (ROCm,
OpenAI-compatible)** and points the synthesizer at it (`SYNTHESIZER=amd`). Keep `fireworks`
as the reliable default/demo path. Because vLLM speaks the OpenAI API, switching is just a
config change. Deadline is July 11 (exact hour shown per-user in the lablab "Event Schedule"
tab — not published as a fixed time; verify while logged in).

**Config routes it:** default on the MI300X pod = perception local (GPU) + synthesis on
Fireworks Gemma. On a laptop / no key / CI = mock or CPU. `MOCK_MODE=true` runs the whole
pipeline offline from a bundled fixture transcript → the demo never hard-fails.

### Key technical facts (from research — don't re-learn these)
- **Fireworks is OpenAI-compatible.** `openai` SDK, `base_url=https://api.fireworks.ai/inference/v1`,
  `Authorization: Bearer $FIREWORKS_API_KEY`.
- **Gemma 4 on Fireworks is multimodal (text+image).** Model id
  `accounts/fireworks/models/gemma-4-31b-it` (primary); cheaper variants
  `gemma-4-26b-a4b-it`, `gemma-4-31b-it-nvfp4`.
- **Structured output:** `response_format={"type":"json_schema","json_schema":{"name":...,
  "schema": <JSON Schema>}}` AND describe the schema in the prompt too. Do **not** proxy
  through LiteLLM (it silently downgrades json_schema → json_object). Use the OpenAI SDK
  directly.
- **Vision input:** OpenAI `image_url` content parts; ≤30 images/request; base64 payload
  < 10 MB; URL images < 5 MB and must fetch < 1.5 s.
- **Fireworks Whisper is DEAD** (deprecated 2026-06-10). ASR must be local.
- **ROCm PyTorch masquerades as CUDA:** `torch.cuda.is_available()` is `True` on MI300X,
  device string is `"cuda"`, `torch.version.hip` is set. Same code runs CPU/laptop/MI300X.
  MI300X is `gfx942`; install wheels from `download.pytorch.org/whl/rocm6.4`. Do NOT pin
  `+rocm` in `requirements.txt` (won't resolve on a laptop) — pass the ROCm `--index-url`
  only in the cloud/Docker install step.
- **Whisper on ROCm:** use HF `transformers` Whisper (pure PyTorch). **Avoid faster-whisper**
  (CTranslate2 has no ROCm backend).
- **VLM:** `Qwen/Qwen2.5-VL-7B-Instruct` (Apache-2.0, non-gated — avoids license stalls);
  ~16-18 GB fp16, trivial on MI300X's 192 GB.
- **AMD Dev Cloud gotchas:** `apt-get install -y ffmpeg` (base image may lack it); set
  `HF_TOKEN` and pre-download weights; scope GPUs with `HIP_VISIBLE_DEVICES=0`.

---

## 4. Tech stack

- **Python 3.12 + FastAPI + Uvicorn.** Pydantic v2 / pydantic-settings.
- Async in-process job worker (asyncio) + **SQLite** (via `sqlite3`/SQLModel) job+recipe store.
- Media: `yt-dlp`, `ffmpeg` (system), `scenedetect[opencv]`.
- ML (GPU stages, optional at runtime): `torch/torchaudio` (ROCm on cloud), `transformers`,
  `accelerate`, `qwen-vl-utils`.
- LLM: `openai` SDK → Fireworks. Optional `ingredient-parser-nlp` for qty/unit validation.
- Packaging: `Dockerfile` (+ `docker-compose.yml`), `Makefile`, tests (`pytest`).

---

## 5. API surface (planned)

- `POST /api/v1/recipes` — body `{ "url": "..." }` or multipart file → creates a job,
  returns `{ job_id }` (async).
- `GET  /api/v1/jobs/{job_id}` — status + progress (stage, pct).
- `GET  /api/v1/jobs/{job_id}/events` — SSE live progress.
- `GET  /api/v1/recipes/{recipe_id}` — the structured recipe.
- `GET  /api/v1/recipes/{recipe_id}/schema-org` — schema.org/Recipe JSON-LD.
- `GET  /api/v1/recipes` — list.
- `GET  /health` · `GET /api/v1/meta` (active providers / GPU status).

---

## 6. Naming

Working name **RecipeReel** (repo `recipe-reel`). Alternatives if the user prefers: Mise,
SousChef, PanScribe, ReelToRecipe, Simmer, ForkCast. Rename = repo + `app` package strings;
kept shallow so it's a quick change.

---

## 7. Status / history log

- **2026-07-10** — Kickoff. Researched hackathon rules (browser, official page) + Fireworks
  API + ROCm/Whisper/VLM + video→recipe pipeline (4 subagents). Locked architecture above.
  Decisions: Track 3 (Unicorn); product = cooking-video → structured recipe; Gemma-on-
  Fireworks synthesis (targets $2k Gemma prize); local Whisper + Qwen2.5-VL on MI300X for
  the AMD-compute story; pluggable providers + mock mode for offline/CI runnability.
  User confirmed: repo under GitHub `avinmaster` (private now → public at submission), has a
  Fireworks key (real calls behind env vars), scope = Advanced.
  Scaffolding created; CLAUDE.md written. Next: implement backend.

- **2026-07-11** — Backend v0.1 built & verified. FastAPI app with async job worker + SSE,
  SQLite store, pluggable providers (transcribe: local-whisper/mock; vision: local-qwen-vl/
  fireworks-gemma/none/mock; synth: fireworks/amd-vllm/mock), full Recipe model with
  provenance + per-step video timestamps + schema.org JSON-LD export, ingredient
  dedupe/unit-normalization post-processing. Endpoints: POST /recipes (+/upload), GET
  /jobs/{id}(+/events SSE), GET /recipes/{id}(+/schema-org), /health, /api/v1/meta. Mock mode
  runs the whole pipeline offline from bundled fixtures (garlic-butter-shrimp-pasta). Added
  Dockerfile (slim) + Dockerfile.rocm (MI300X) + compose + Makefile + demo/serve scripts +
  tests (11 passing) + docs/ARCHITECTURE.md + docs/SUBMISSION.md. Verified: pytest green,
  ruff clean, `docker run` serves a recipe end-to-end. Fixed a container DB-path bug
  (sqlite parent dir now auto-created; DATABASE_URL pinned to DATA_DIR in images).
  TODO for user: run perception on the MI300X pod; add FIREWORKS_API_KEY to .env; record
  demo video + slides; **flip repo to public before submitting**.

- **2026-07-11 (ops)** — Fireworks credit path (from LabLab Admin Discord FAQ): the $50 is
  claimed via **Fire Pass** → https://app.fireworks.ai/fire-pass → enter an **invite code** →
  Unlock → create a NEW `fpk-…` key (Settings→API Keys) → use `BASE_URL=https://api.fireworks.ai/inference/v1`.
  The invite code is NOT posted in Discord (per-participant; check registered email +
  lablab Event Dashboard; many participants reported delays). **Gotcha:** Fire Pass currently
  unlocks only **GLM 5.2 Fast** + **Kimi K2.7 Code Fast** — **NOT Gemma**, and those are
  text-only. Implications: (a) if only Fire Pass, set `SYNTH_MODEL` to the GLM/Kimi Fire Pass
  path (our synth is model-agnostic) — works but forfeits the Gemma prize; (b) Gemma needs real
  serverless credits (account "Credits" balance) OR — the robust play — **host Gemma on the
  MI300X via vLLM (`SYNTHESIZER=amd`)**, which also directly targets the $2k "Best AMD-Hosted
  Gemma" prize and sidesteps the credit/invite-code mess. Repo is now **public**
  (github.com/avinmaster/recipe-reel). User's Fireworks acct email matches hackathon signup.

<!-- Append new entries here as work progresses. Keep it terse and factual. -->

---

## 8. Conventions for Claude

- Keep the pipeline **always runnable**: any provider missing → fall back, never hard-crash.
- **Never commit secrets.** Config via env / `.env` (git-ignored). `.env.example` documents keys.
- Match existing code style; keep modules small and single-purpose.
- When you finish a meaningful chunk, **append a dated line to the Status log above.**
- Optimize copy/wording for the T3 judging criteria (esp. "Use of AMD Platforms" + product framing).
