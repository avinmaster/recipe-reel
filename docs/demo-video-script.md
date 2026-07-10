# Demo video script — RecipeReel (Track 3)

**Target length:** 60–90 seconds. **Voiceover required** (organizers confirmed in Discord).
Record your screen; read the voiceover lines; keep it snappy. Aim: show the product working
and make the AMD usage explicit.

**Setup before recording**
1. Paste your Fireworks key into `.env` → `FIREWORKS_API_KEY=fw_...` (credits are already live).
2. Start the API: `VISION=fireworks SYNTHESIZER=fireworks uvicorn app.main:app`
   (on the MI300X pod use `TRANSCRIBER=local VISION=local` for the on-GPU story).
3. Have a short cooking video URL ready, plus `/docs` (Swagger) and `/api/v1/meta` open in tabs.

---

### Shot 1 — Hook (0:00–0:10)
🎙 *"This is a twelve-minute cooking video. The recipe is in there somewhere — but good luck
finding how much flour, or jumping to the right step. RecipeReel fixes that."*
🎬 Show a cooking video playing / scrubbing back and forth.

### Shot 2 — Do it (0:10–0:30)
🎙 *"I paste the link into RecipeReel… and it gets to work. It pulls the audio and samples
frames, transcribes the narration, and reads the on-screen text — because that's where the
real quantities live, not in what's spoken."*
🎬 `POST /api/v1/recipes` with the URL (curl or Swagger `/docs`); show the live SSE progress
ticking through stages: transcribing → analyzing frames → synthesizing.

### Shot 3 — The result (0:30–0:55)
🎙 *"A few seconds later: one clean, structured recipe. Ingredients with real quantities.
Step-by-step instructions — and every step deep-links to the exact second in the video.
Prep and cook times, equipment, nutrition. And notice — where an amount was never given,
it says null. It never invents a number."*
🎬 Show the returned recipe JSON (`GET /api/v1/recipes/{id}`), scroll the ingredients (point at
`"source": "on_screen"` and a `quantity: null`), then the steps (point at `start_time_seconds`).
Then hit `/schema-org` to show the JSON-LD export.

### Shot 4 — The AMD story (0:55–1:10)
🎙 *"The heavy lifting — Whisper speech recognition and Qwen vision — runs on an AMD Instinct
MI300X through ROCm. Gemma does the structured reasoning, hosted on AMD. Same code runs on a
laptop or the GPU, and if anything's missing it degrades gracefully instead of crashing."*
🎬 Show `GET /api/v1/meta` (device / gpu_name / ROCm), or the pod terminal with
`torch.cuda.is_available()` → True and the MI300X name.

### Shot 5 — Close (1:10–1:25)
🎙 *"RecipeReel — from reel to recipe. Every cooking video, finally machine-readable.
Built on AMD, open source, and ready to ship."*
🎬 Cut to the cover / repo (github.com/avinmaster/recipe-reel).

---

**If you can't run it live:** record the offline demo instead — `MOCK_MODE=true uvicorn app.main:app`
then `./scripts/demo.sh` — it streams the same pipeline and returns the full sample recipe with
zero setup. Narrate the same story; just note it's the offline demo path.
