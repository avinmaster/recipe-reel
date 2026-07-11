# JustCook — RecipeReel front-end

The web UI for RecipeReel. A **self-contained, no-build** single-page app (vanilla
HTML/CSS/JS, no dependencies) that faithfully implements the JustCook design in `../design/`.

## What it does

- **One app, two shells.** Desktop viewports (> 820px) get the editorial **web** layout;
  phone viewports (≤ 820px) get the full-bleed **iOS-app** layout — the mobile design used as
  the actual mobile-web experience, not a squished responsive page.
- **Screens:** Home / Discover, Recipe detail (video + ingredients + timecoded method +
  equipment), Cook mode, Recipe Library / Browse (live search + difficulty filters + hover
  video-preview), Add-via-link, Saved.
- **Real videos.** The eight cooking videos supplied by the team are wired in (Joshua Weissman's
  pepperoni pizza is the featured cook). Paste any YouTube / Vimeo / Instagram / Facebook / TikTok
  link and it embeds inline; tap a step's timecode to jump the video to that moment.
- **Realistic media.** Verified Unsplash food photography for posters/cards + real YouTube
  thumbnails; accurate brand logos; ingredient emojis kept as designed.
- **Live extraction (progressive enhancement).** On the "Add a video" flow, if the RecipeReel
  backend is reachable, pasting a link runs a real extraction job and streams live progress over
  SSE (Whisper + Qwen2.5-VL on AMD MI300X → Gemma). With no backend it gracefully falls back to
  a client-side embed, so the static demo never hard-fails.

## Run it

**Served by the backend (recommended — enables live extraction):**

```bash
# from the repo root
MOCK_MODE=true uvicorn app.main:app --reload
# open http://localhost:8000/          (redirects to /app/)
```

The UI is mounted at `/app/`; the API stays at `/api/v1/...` and docs at `/docs`.

**Standalone static (design demo only):**

```bash
cd web && python3 -m http.server 8123
# open http://localhost:8123/
```

## Layout

| File | Purpose |
|------|---------|
| `index.html` | Shell: fonts, meta, favicon, mounts. |
| `assets/app.css` | Design tokens + all component styles (desktop + mobile). |
| `assets/data.js` | Seed data — recipes, Unsplash/YouTube media, video ids, brand SVG logos. |
| `assets/app.js` | Router + desktop/mobile renderers + interactions + optional live-extract client. |

## Dev conveniences

- `?force=mobile` / `?force=desktop` — preview either shell regardless of window width.
- The app auto-detects the API base from its own origin; when opened as a static file it targets
  `http://localhost:8000`.
