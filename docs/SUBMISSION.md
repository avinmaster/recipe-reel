# Submission checklist — AMD Developer Hackathon: ACT II · Track 3 (Unicorn)

**Deadline:** July 11, 2026 (exact hour shown in your local timezone on the event's
**Event Schedule** tab — verify it while logged in). Submit on lablab.ai.

> ⚠️ **YOU submit the lablab form and manage the team — Claude will not do either.**

## 🟢 Status (autonomous session, night of Jul 10→11)
- **Repo is PUBLIC:** https://github.com/avinmaster/recipe-reel (MIT, README, Dockerfile, tests).
- **Pitch deck (9 slides, print→PDF ready):** https://claude.ai/code/artifact/cc363a5d-4bc7-47e5-8958-5409b8c11945
- **Cover image (1200×630, screenshot it):** https://claude.ai/code/artifact/25cdd81e-4737-4afe-9519-8002fec49ccd
- **Fireworks $50 credits: redeemed** (coupon `FW-LABLAB-SEN8`) → Credits $50.00 live; API key
  created and in `.env` (verified reaching the API). **BUT** — to run inference the Fireworks
  account still needs a **payment method added** to activate it (billing page:
  *"Add a payment method to activate your account"*). The $50 credits then cover usage. **This
  is your financial call — Claude can't add card details.** Also verified: **Gemma is not on
  Fireworks serverless** (404s); Fire Pass grants **GLM 5.2 Fast / Kimi** only.
  **Official confirmation (LabLab Admin bot, Jul 11):** *"You cannot use the hackathon Fireworks
  credits without a payment method."* Another participant (BENI) hit the identical wall; no
  card-free workaround exists. Also: **Fireworks is not required for Track 3** (rules say "AMD GPUs
  **and/or** Fireworks"); Gemma is a bonus. So don't get stuck on Fireworks.
- **Ways to a real run (pick one):**
  1. **Real Gemma NOW — free, no card (Google AI Studio):** the fastest working path today.
     Get a free key (no card) at https://aistudio.google.com/apikey, then:
     ```bash
     SYNTHESIZER=fireworks FIREWORKS_API_KEY=<google-key> \
       FIREWORKS_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/ \
       SYNTH_MODEL=gemma-4-31b-it VISION=none TRANSCRIBER=mock uvicorn app.main:app
     ```
     Real Gemma output — but not *AMD-hosted* (great for the demo; not the AMD-Gemma prize).
  2. **AMD MI300X pod (wins the AMD-Gemma prize):** self-host Gemma via vLLM, perception on-GPU:
     ```bash
     ./scripts/serve_amd_gemma.sh
     TRANSCRIBER=local VISION=local SYNTHESIZER=amd uvicorn app.main:app
     ```
     ⚠️ The AMD notebook cloud is in an ongoing 504/502 OUTAGE (organizers said "stop requesting
     notebooks until resolved") — retry when it's back.
  3. **Fireworks (only if you add a card):** `SYNTH_MODEL=accounts/fireworks/routers/glm-5p2-fast VISION=none`.
  4. **Zero-setup fallback for the demo video:** `MOCK_MODE=true` runs the whole pipeline offline
     and returns the full sample recipe — narrate that if live inference isn't ready.
- **Still needs you:** record the demo video (voiceover required), export the deck to PDF, then
  submit on lablab. Paste-ready copy is in `docs/submission-copy.md`; candidate videos in
  `docs/test-videos.md`.

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
