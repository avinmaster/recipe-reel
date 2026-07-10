# Submission checklist — AMD Developer Hackathon: ACT II · Track 3 (Unicorn)

**Deadline:** July 11, 2026 (exact hour shown in your local timezone on the event's
**Event Schedule** tab — verify it while logged in). Submit on lablab.ai.

## lablab form fields
- [ ] **Project Title** — RecipeReel
- [ ] **Short description** — *Turn any cooking video into a perfect, structured recipe — ingredients with real quantities, timestamped steps, and nutrition.*
- [ ] **Long description** — see draft below
- [ ] **Technology & category tags** — AMD Developer Cloud, AMD ROCm, AMD MI300X, Gemma, Fireworks AI, Whisper, Qwen2.5-VL, FastAPI, Python, Computer Vision, Multimodal
- [ ] **Cover image**
- [ ] **Video presentation** (demo video — record a run: paste a cooking video URL → watch the recipe build)
- [ ] **Slide presentation** (pitch deck — problem, solution, AMD usage, market)
- [ ] **Public GitHub repository** — ⚠️ currently PRIVATE (`avinmaster/recipe-reel`). **Flip to public before submitting.**
- [ ] **Demo application platform + Application URL** — deploy the API (and the separate frontend)

## Hard requirements (from the rules)
- [x] **MIT-licensed & original** — `LICENSE` present (MIT).
- [x] **Containerized** — `Dockerfile` (slim) + `Dockerfile.rocm` (MI300X) + `docker-compose.yml`.
- [x] **Public repo w/ README incl. setup + usage** — `README.md` (make repo public at submit).
- [x] **Runnable from instructions** — `MOCK_MODE=true` runs with zero config; `docker run` works.
- [ ] **Use AMD compute** — run perception on the MI300X pod (see below). This is a judged criterion.

## Before flipping the repo public
- [ ] Confirm **no secrets** committed: `git log -p | grep -i -E "fw_|api_key|secret"` → nothing. `.env` is git-ignored.
- [ ] `.env` is NOT tracked (only `.env.example`).
- [ ] `make test` passes; `docker run` serves `/docs`.

## Run on AMD Developer Cloud (MI300X) — the "Use of AMD Platforms" proof
```bash
# 1) verify GPU
python -c "import torch; print(torch.cuda.is_available(), torch.version.hip)"   # True 6.x
# 2) install
pip install torch torchaudio --index-url https://download.pytorch.org/whl/rocm6.4
pip install -r requirements.txt -r requirements-gpu.txt
apt-get install -y ffmpeg
# 3) run perception on-GPU, synthesis on Gemma
TRANSCRIBER=local VISION=local SYNTHESIZER=fireworks FIREWORKS_API_KEY=... uvicorn app.main:app
#    …or host Gemma on the MI300X too (targets the $2k Track-3 Gemma prize):
./scripts/serve_amd_gemma.sh      # vLLM Gemma on ROCm
SYNTHESIZER=amd uvicorn app.main:app
```
`GET /api/v1/meta` and each recipe's `processing` block report the live device / GPU name /
ROCm version — screenshot these for the demo to make AMD usage concrete.

## How RecipeReel maps to the Track-3 judging criteria
- **Creativity & Originality** — no other ACT II project extracts recipes from video; fusing
  ASR + on-screen-text (where quantities actually live) + timestamped step deep-links is novel.
- **Product/Market Potential** — a real, universal pain (recipe apps, creators, meal-planning,
  grocery integrations). Clean API → easy to productize; schema.org output → SEO/rich results.
- **Completeness** — full async pipeline, REST + SSE, persistence, schema.org export, tests,
  Docker, graceful fallbacks; runs offline in one command.
- **Use of AMD Platforms** — Whisper + Qwen2.5-VL on MI300X/ROCm; optional AMD-hosted Gemma via
  vLLM. Hardware/provider transparency exposed in the API.

---

### Long-description draft
> **RecipeReel turns any cooking video into a perfect, structured recipe.** Paste a YouTube,
> TikTok, or Instagram link (or upload a file) and get back ingredients with real quantities,
> step-by-step instructions that deep-link to the exact moment in the video, prep/cook times,
> equipment, tips, and an estimated nutrition panel — as clean JSON or schema.org rich-recipe data.
>
> Most tools only read the transcript and miss the amounts, because in real cooking videos the
> quantities are shown on screen, not spoken. RecipeReel fuses **three signals**: Whisper-large-v3
> speech recognition and Qwen2.5-VL vision + on-screen-text extraction — both running on **AMD
> Instinct MI300X GPUs via ROCm** — and **Gemma** (on Fireworks AI, or hosted on AMD via vLLM)
> for the structured reasoning. Quantities are never invented; every field is traceable to what
> was spoken, shown, or inferred.
>
> Built as a production-style FastAPI backend: async jobs, live progress over SSE, SQLite
> persistence, pluggable providers with graceful fallback, containerized, and MIT-licensed.
