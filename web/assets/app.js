/* ===================================================================
   RecipeReel — front-end app
   Adaptive single-page app: desktop web shell (>820px) and full-bleed
   iOS-style mobile shell (<=820px) share one data + design language.
   No build step, no dependencies.
   =================================================================== */
(function () {
  "use strict";
  const { LOGOS, FEATURED, RECIPES, CATEGORIES, CUISINES, YT_THUMB_FALLBACK } = window.JC;

  /* ---------- tiny helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const app = () => document.getElementById("app");
  const h = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const mq = window.matchMedia("(max-width: 820px)");
  const isMobile = () => {
    const f = (location.search.match(/[?&]force=(mobile|desktop)/) || [])[1];
    if (f === "mobile") return true;
    if (f === "desktop") return false;
    return mq.matches;
  };
  /* Live-extracted recipes (mapped from the backend) live here, keyed by id, and
     take precedence over the seed library so a real extraction actually renders. */
  const EXTRACTED = {};
  const byId = (id) => EXTRACTED[id] || RECIPES.find((r) => r.id === id) || null;
  const posterErr = (r) =>
    r.posterFallback ? ` onerror="this.onerror=null;this.src='${r.posterFallback}'"` : "";

  /* ---------- backend Recipe → front-end recipe shape ---------- */
  const GROUP_STYLES = [
    { color: "#f24e1e", bg: "#fff1ec" }, { color: "#09a866", bg: "#e9f9f1" },
    { color: "#a259ff", bg: "#f4edff" }, { color: "#0d99ff", bg: "#eaf4ff" },
    { color: "#e08422", bg: "#fff6ec" }, { color: "#e0341a", bg: "#ffecea" },
  ];
  const STEP_COLORS = ["#f24e1e", "#e08422", "#09a866", "#0d99ff", "#a259ff"];
  const PROV = {
    on_screen: { label: "on-screen", color: "#0d78d4", bg: "#eaf4ff" },
    spoken: { label: "spoken", color: "#09a866", bg: "#e9f9f1" },
    inferred: { label: "inferred", color: "#e08422", bg: "#fff6ec" },
  };
  const FALLBACK_POSTER =
    "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=1000&q=75&auto=format&fit=crop";
  const EMOJI_MAP = [
    [/pizza|dough|flour|bread|crust/, "🌾"], [/yeast/, "🫧"], [/water/, "💧"],
    [/salt/, "🧂"], [/pepper|chilli|chili|paprika|cayenne/, "🌶️"], [/olive oil|oil/, "🫒"],
    [/sugar|honey|syrup|caramel/, "🍬"], [/tomato|marinara|passata|ketchup/, "🍅"], [/garlic/, "🧄"],
    [/onion|shallot|scallion|leek/, "🧅"], [/oregano|basil|parsley|cilantro|coriander|herb|thyme|rosemary|mint|dill/, "🌿"],
    [/cheese|mozzarella|parmesan|cheddar|feta|ricotta/, "🧀"], [/pepperoni|salami|sausage|bacon|ham|chorizo/, "🍖"],
    [/shrimp|prawn/, "🦐"], [/fish|salmon|tuna|cod|anchov/, "🐟"], [/chicken|poultry|turkey/, "🍗"],
    [/beef|steak|mince|ground meat|brisket/, "🥩"], [/pork|lamb/, "🥓"], [/egg/, "🥚"], [/butter|ghee|margarine/, "🧈"],
    [/milk|cream|yog|yoghurt|yogurt|buttermilk/, "🥛"], [/pasta|linguine|spaghetti|noodle|penne|semolina|macaroni/, "🍝"],
    [/\brice\b|risotto/, "🍚"], [/lemon|lime|citrus/, "🍋"], [/wine|vinegar|stock|broth|soy|sauce/, "🍶"],
    [/mushroom/, "🍄"], [/potato/, "🥔"], [/carrot/, "🥕"], [/corn|maize/, "🌽"], [/bean|lentil|chickpea|pea\b/, "🫘"],
    [/chocolate|cocoa|cacao/, "🍫"], [/vanilla/, "🍦"], [/nut|almond|walnut|peanut|cashew|pecan/, "🥜"],
    [/apple/, "🍎"], [/banana/, "🍌"], [/berry|strawberr|raspberr|blueberr|blackberr/, "🍓"],
    [/avocado/, "🥑"], [/spinach|lettuce|greens|kale|cabbage/, "🥬"], [/curry|cumin|turmeric|masala|spice/, "🌶️"],
    [/flour|starch|baking/, "🌾"], [/broccoli/, "🥦"], [/cucumber|pickle/, "🥒"],
  ];
  function guessEmoji(name) {
    const n = (name || "").toLowerCase();
    for (const [re, e] of EMOJI_MAP) if (re.test(n)) return e;
    return "🍽️";
  }
  const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : s);
  function fmtNum(n) {
    if (n == null) return null;
    const r = Math.round(n * 100) / 100;
    return String(r);
  }
  function fmtQty(q, unit) {
    const n = fmtNum(q);
    if (n == null) return null;
    return unit ? n + " " + unit : n;
  }
  const amtText = (ing) => fmtQty(ing.quantity, ing.unit) || ing.notes || "";
  function ingName(ing) {
    const hasQty = fmtQty(ing.quantity, ing.unit) != null;
    let nm = ing.name || "";
    if (hasQty && ing.notes) nm += ", " + ing.notes;
    if (ing.optional) nm += " (optional)";
    return nm;
  }
  function secToTc(s) {
    if (s == null) return "0:00";
    s = Math.max(0, Math.round(s));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }
  function minLabel(m) {
    if (m == null) return "";
    m = Math.round(m);
    if (m < 60) return m + " min";
    const hr = Math.floor(m / 60), mm = m % 60;
    return mm ? hr + " hr " + mm + " min" : hr + " hr";
  }
  function shortTitle(instruction, i) {
    const first = String(instruction || "").split(/[.,;:]/)[0].trim();
    const t = first.split(/\s+/).slice(0, 6).join(" ");
    return t ? cap(t) : "Step " + (i + 1);
  }
  function ytIdFromInfo(info) {
    if (!info || info.type !== "youtube") return null;
    const m = String(info.base || "").match(/embed\/([^/?]+)/);
    return m ? m[1] : null;
  }
  function mapApiRecipe(api, info) {
    const groupsMap = new Map();
    (api.ingredients || []).forEach((ing) => {
      const key = ing.group || "Ingredients";
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key).push(ing);
    });
    let gi = 0;
    const ingredientGroups = Array.from(groupsMap.entries()).map(([title, items]) => {
      const st = GROUP_STYLES[gi++ % GROUP_STYLES.length];
      return {
        title, color: st.color, bg: st.bg,
        items: items.map((it) => ({
          amt: amtText(it), name: ingName(it), emoji: guessEmoji(it.name), src: it.source,
        })),
      };
    });
    const steps = (api.steps || []).map((s, i) => ({
      t: shortTitle(s.instruction, i),
      time: minLabel(s.duration_minutes) || (s.temperature || ""),
      c: STEP_COLORS[i % STEP_COLORS.length],
      tc: secToTc(s.start_time_seconds),
      start: Math.round(s.start_time_seconds || 0),
      photo: null,
      d: (s.instruction || "") + (s.tip ? "  💡 " + s.tip : ""),
    }));
    const total = api.total_time_minutes != null ? api.total_time_minutes
      : ((api.prep_time_minutes || 0) + (api.cook_time_minutes || 0)) || null;
    const src = api.source || {};
    const ytId = ytIdFromInfo(info);
    const poster = src.thumbnail_url
      || (ytId ? "https://i.ytimg.com/vi/" + ytId + "/maxresdefault.jpg" : FALLBACK_POSTER);
    const platform = (info && info.platform)
      || (src.platform && src.platform !== "mock" ? cap(src.platform) : null);
    let serves = "—";
    if (api.servings_count != null) serves = String(api.servings_count);
    else if (api.servings) serves = String(api.servings).replace(/servings?/i, "").trim() || String(api.servings);
    return {
      id: api.id,
      name: api.title || "Untitled recipe",
      titleAccent: (api.title || "").trim().split(/\s+/).slice(-1)[0] || "",
      cuisine: api.cuisine || api.category || "",
      difficulty: cap(api.difficulty) || "Easy",
      time: total != null ? minLabel(total) : "",
      serves,
      rating: null,
      confidence: api.confidence != null ? Math.round(api.confidence * 100) : null,
      duration: src.duration_seconds ? secToTc(src.duration_seconds) : "",
      channel: src.channel || "RecipeReel",
      episode: platform ? "From " + platform : "AI-extracted",
      cooks: null,
      description: api.description
        || "Extracted from the video you pasted — ingredients, quantities and timecoded steps below.",
      prep: api.prep_time_minutes != null ? String(Math.round(api.prep_time_minutes)) : null,
      cook: api.cook_time_minutes != null ? String(Math.round(api.cook_time_minutes)) : null,
      total: total != null ? String(Math.round(total)) : null,
      poster,
      posterFallback: ytId ? "https://i.ytimg.com/vi/" + ytId + "/hqdefault.jpg" : null,
      video: ytId,
      ingredientGroups,
      equipment: (api.equipment || []).map((e) => "🍴 " + e.name),
      steps,
      tips: api.tips || [],
      warnings: api.warnings || [],
      processing: api.processing || {},
      sourceUrl: src.url || null,
      extracted: true,
    };
  }

  /* API base — same origin if served by FastAPI, else localhost:8000 */
  const API_BASE = (() => {
    const o = location.origin;
    if (o && /^https?:/.test(o) && !/^file:/.test(o)) return o.replace(/\/$/, "");
    return "http://localhost:8000";
  })();

  /* ---------- inline icons ---------- */
  const IC = {
    home: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></svg>`,
    search: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`,
    plus: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
    bookmark: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>`,
    bookmarkFill: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#f24e1e"><path d="M6 3h12v18l-6-4-6 4z"/></svg>`,
    user: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>`,
    back: `<svg width="11" height="18" viewBox="0 0 12 20" fill="none"><path d="M10 2L2 10l8 8" stroke="#1e1e1e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    searchSm: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b0aca5" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`,
    link: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" stroke-width="2" stroke-linecap="round"><path d="M9 15l6-6M10.5 6.5l1-1a3.5 3.5 0 0 1 5 5l-1 1M13.5 17.5l-1 1a3.5 3.5 0 0 1-5-5l1-1"/></svg>`,
    upload: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7a766f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 20h16"/></svg>`,
  };
  // Feature-card icons — line style; each inherits its accent from the tile's `color` (currentColor).
  const FI = {
    link: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1"/><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1"/></svg>`,
    check: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6.4l1.1 1.1 2.1-2.6M3.5 12.4l1.1 1.1 2.1-2.6M3.5 18.4l1.1 1.1 2.1-2.6"/></svg>`,
    clock: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3.5 2"/></svg>`,
    details: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M3.5 9.5h17"/><path d="M7 13.5h7M7 16.2h4.5"/></svg>`,
    pan: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="13.5" r="6.5"/><path d="M16.2 9.2l5.8-2.4"/></svg>`,
    save: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v16l-6-4-6 4z"/></svg>`,
  };
  const PLATFORMS = [
    { key: "youtube", label: "YouTube" }, { key: "vimeo", label: "Vimeo" },
    { key: "instagram", label: "Instagram" }, { key: "facebook", label: "Facebook" },
    { key: "tiktok", label: "TikTok" },
  ];

  /* ---------- video URL parsing (ports the design logic) ---------- */
  function parseVideo(raw) {
    let url = (raw || "").trim();
    if (!url) return { error: "Paste a video link to load it." };
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    let u;
    try { u = new URL(url); } catch (e) { return { error: "That doesn't look like a valid link." }; }
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") { const id = u.pathname.slice(1); if (id) return { base: "https://www.youtube.com/embed/" + id, type: "youtube", platform: "YouTube" }; }
    if (host.endsWith("youtube.com")) {
      let id = u.searchParams.get("v");
      if (!id) { const m = u.pathname.match(/\/(shorts|embed)\/([^/?]+)/); if (m) id = m[2]; }
      if (id) return { base: "https://www.youtube.com/embed/" + id, type: "youtube", platform: "YouTube" };
    }
    if (host.endsWith("vimeo.com")) { const m = u.pathname.match(/\/(\d+)/); if (m) return { base: "https://player.vimeo.com/video/" + m[1], type: "vimeo", platform: "Vimeo" }; }
    if (host.endsWith("instagram.com")) { const m = u.pathname.match(/\/(reel|reels|p|tv)\/([^/?]+)/); if (m) { const t = m[1] === "reels" ? "reel" : m[1]; return { base: "https://www.instagram.com/" + t + "/" + m[2] + "/embed", type: "other", platform: "Instagram" }; } }
    if (host.endsWith("facebook.com") || host === "fb.watch") { return { base: "https://www.facebook.com/plugins/video.php?href=" + encodeURIComponent(url) + "&show_text=false&width=734", type: "other", platform: "Facebook" }; }
    if (host.endsWith("tiktok.com")) { const m = u.pathname.match(/\/video\/(\d+)/); if (m) return { base: "https://www.tiktok.com/embed/v2/" + m[1], type: "other", platform: "TikTok" }; return { error: "Paste a full TikTok video URL that includes /video/…" }; }
    if (host.endsWith("dailymotion.com")) { const m = u.pathname.match(/\/video\/([^/?_]+)/); if (m) return { base: "https://www.dailymotion.com/embed/video/" + m[1], type: "other", platform: "Dailymotion" }; }
    if (host === "dai.ly") { const id = u.pathname.slice(1); if (id) return { base: "https://www.dailymotion.com/embed/video/" + id, type: "other", platform: "Dailymotion" }; }
    return { error: "That platform isn't supported yet. Try YouTube, Vimeo, Instagram, Facebook or TikTok." };
  }
  function embedSrc(base, type, start) {
    if (type === "youtube") return base + "?rel=0&modestbranding=1&playsinline=1" + (start ? "&start=" + start + "&autoplay=1" : "");
    if (type === "vimeo") return base + (start ? "#t=" + start + "s" : "");
    return base;
  }
  function videoFromId(id) { return { base: "https://www.youtube.com/embed/" + id, type: "youtube", platform: "YouTube" }; }

  /* ---------- app state ---------- */
  const state = {
    view: "home", recipeId: FEATURED.id,
    video: null,            // {base,type,platform} once loaded
    showPaste: false,       // recipe: paste card visible instead of video
    checked: {}, done: {},  // per-recipe sets
    query: "", filter: "all",
    tab: "discover",        // mobile bottom tab
    seg: "ingredients",     // mobile recipe segment
    cook: false, activeStep: 0,
    extractJob: null,       // live extraction in progress {raw,info,pct,stageKey,phase,error,jobId}
    captcha: { enabled: false, token: null, at: 0, solving: false },
    ingest: { upload: true, youtube: true, youtube_provider: null }, // from /api/v1/meta.ingest
  };
  const checkedSet = (id) => (state.checked[id] = state.checked[id] || new Set());
  const doneSet = (id) => (state.done[id] = state.done[id] || new Set());

  /* ===================================================================
     ROUTER
     =================================================================== */
  function parseHash() {
    const raw = (location.hash || "#/").replace(/^#/, "");
    const parts = raw.split("/").filter(Boolean);
    if (!parts.length) return { view: "home" };
    if (parts[0] === "recipe") return { view: "recipe", id: parts[1] || FEATURED.id };
    if (parts[0] === "library") return { view: "library" };
    if (parts[0] === "saved") return { view: "saved" };
    if (parts[0] === "add") return { view: "add" };
    if (parts[0] === "extract") return { view: "extract" };
    return { view: "home" };
  }
  function navigate(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function openRecipe(id, autoload) {
    const r = byId(id) || FEATURED;
    state.recipeId = r.id;
    state.showPaste = !(autoload !== false && r.video);
    state.video = r.video && autoload !== false ? videoFromId(r.video) : null;
    state.seg = "ingredients"; state.cook = false; state.activeStep = 0;
    navigate("#/recipe/" + r.id);
  }

  /* recipe content: a live-extracted recipe (or the featured pizza) carries its own
     fully-authored body — render it verbatim. A compact library card has no body, so
     it borrows the featured structured shell (demo) while keeping its own identity. */
  function recipeContent(r) {
    if (r && r.ingredientGroups && r.steps) return r;
    return Object.assign({}, FEATURED, {
      id: r.id, name: r.name, cuisine: r.cuisine, difficulty: r.difficulty,
      time: r.time, serves: r.serves, rating: r.rating, duration: r.duration,
      video: r.video, poster: r.poster, posterFallback: r.posterFallback,
      channel: r.channel || FEATURED.channel,
    });
  }

  /* Title with the accent word highlighted (works for extracted + featured). */
  function titleHTML(r) {
    const name = r.name || "Recipe";
    const acc = r.titleAccent;
    if (acc && name.includes(acc)) {
      return h(name).replace(h(acc), `<span class="accent">${h(acc)}</span>`);
    }
    return h(name);
  }
  const provHTML = (src) => {
    const p = PROV[src];
    return p ? `<span class="prov" style="color:${p.color};background:${p.bg}">${p.label}</span>` : "";
  };

  /* ===================================================================
     SHARED FRAGMENTS
     =================================================================== */
  const brandHTML = `<div class="brand" data-act="home"><div class="mark">R</div><span class="name">RecipeReel</span></div>`;
  function difficultyBadge(d, cls) {
    const key = (d || "Easy").toLowerCase();
    return `<span class="badge badge-${key} ${cls || ""}">${h(d)}</span>`;
  }
  function recipeCardHTML(r, opts) {
    opts = opts || {};
    const badge = opts.rankPill
      ? `<div class="badge-wrap"><span class="badge" style="color:#1e1e1e;background:rgba(255,255,255,.94)">🔥 #${r.rank} popular</span></div>`
      : `<div class="badge-wrap">${difficultyBadge(r.difficulty)}</div>`;
    return `
    <div class="recipe-card" data-card="${r.id}">
      <div class="thumb">
        <img src="${r.poster}" alt="${h(r.name)}" loading="lazy"${posterErr(r)}>
        <div class="scrim" style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.3));pointer-events:none"></div>
        ${badge}
        <div class="preview-pill">● Preview</div>
        <div class="center-play" data-play="${r.id}"><span class="play-tri"></span></div>
        <div class="progress"><div class="bar"></div></div>
        <div style="position:absolute;left:12px;bottom:10px;background:rgba(0,0,0,.6);color:#fff;font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;pointer-events:none">${h(r.duration)}</div>
      </div>
      <div class="body">
        ${opts.rankPill ? "" : `<div class="cuisine">${h(r.cuisine)}</div>`}
        <h3>${h(r.name)}</h3>
        <div class="card-meta">
          <span class="chip">⏱ ${h(r.time)}</span>
          <span class="chip">🍽 Serves ${h(r.serves)}</span>
          <span class="rating">★ ${h(r.rating)}</span>
        </div>
      </div>
    </div>`;
  }

  /* ===================================================================
     DESKTOP: HEADER + FOOTER
     =================================================================== */
  function desktopHeader(active) {
    const on = (v) => (active === v ? "active" : "");
    return `
    <header class="site-header">
      <div class="bar">
        ${brandHTML}
        <nav class="nav">
          <a class="${on("library")}" data-act="library">Recipes</a>
          <a data-act="library">Categories</a>
          <a data-act="library">Techniques</a>
          <a data-act="home">Shows</a>
        </nav>
        <div class="header-cta">
          <span class="login">Log in</span>
          <button class="btn btn-dark" data-act="add">▶ Start cooking</button>
        </div>
      </div>
    </header>`;
  }
  function footerHTML() {
    return `
    <footer class="site-footer"><div class="inner">
      <div style="display:flex;align-items:center;gap:9px">
        <div class="mark" style="width:24px;height:24px;border-radius:8px;background:#1e1e1e;display:flex;align-items:center;justify-content:center;color:#fff;font:700 13px/1 var(--head)">R</div>
        <b class="jc-h" style="color:#1e1e1e">RecipeReel</b>
        <span>· Turn any cooking video into a perfect, structured recipe.</span>
      </div>
      <div style="display:flex;gap:18px">
        <span>Recipes</span><span>Techniques</span><span>About</span><span>Privacy</span>
      </div>
    </div></footer>`;
  }
  const marqueeHTML = () => `
    <div class="marquee"><div class="marquee-track">
      ${[0, 1].map(() => `
        <span>🍕 500g bread flour</span><span class="sep">•</span>
        <span>🍅 400g crushed tomatoes</span><span class="sep">•</span>
        <span>🧀 250g mozzarella</span><span class="sep">•</span>
        <span>🍕 100g pepperoni</span><span class="sep">•</span>
        <span>🫧 7g instant yeast</span><span class="sep">•</span>
        <span>🌿 fresh basil</span><span class="sep">•</span>`).join("")}
    </div></div>`;

  /* YouTube link ingest availability (from /api/v1/meta.ingest). Fail-open: only shows the
     "unavailable" notice when the backend explicitly reports youtube:false. */
  function ytIngestOff() { return !!(state.ingest && state.ingest.youtube === false); }
  function ingestNoticeHTML() {
    if (!ytIngestOff()) return "";
    return `<div style="margin:0 0 14px;padding:11px 13px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:13px;line-height:1.45;text-align:left">⚠️ <b>YouTube link extraction is paused right now.</b> Upload the video file instead — or try a Vimeo / Instagram / TikTok link.</div>`;
  }

  /* Shared paste-a-link / upload card (used by the home hero + the Add page) */
  function addLoaderCardHTML(opts) {
    opts = opts || {};
    const heading = opts.heading || "Add a recipe video";
    const sub = opts.sub || "We'll embed it — and if the RecipeReel backend is running, extract the full recipe live.";
    return `
      <div class="loader-card"><div class="loader-tabs"><button class="active" data-loadertab="link">Paste a link</button><button data-loadertab="upload">Upload a file</button></div>
        <div class="loader-body" id="loader-body">
          <div class="icon"><span class="ring"></span><span class="disc"><span class="play-tri"></span></span></div>
          <h3 class="jc-h">${heading}</h3>
          <p>${sub}</p>
          ${ingestNoticeHTML()}
          <div class="url-input">${IC.link}<input id="add-url" type="text" placeholder="https://youtube.com/watch?v=…"><button id="add-load">Extract</button></div>
          <div id="add-err"></div>
          ${captchaWidgetHTML()}
          <div class="platform-row">${PLATFORMS.map((p) => `<span class="platform-chip"><span style="width:17px;height:17px;display:inline-block">${LOGOS[p.key]}</span>${p.label}</span>`).join("")}</div>
        </div>
      </div>`;
  }

  /* ===================================================================
     DESKTOP: HOME
     =================================================================== */
  function homeHTML() {
    const popular = RECIPES.filter((r) => r.popular);
    const browse = RECIPES.slice(0, 9);
    return `
    ${desktopHeader("home")}
    <main class="wrap">
      <section class="hero" data-reveal>
        <div class="hero-grid">
          <div>
            <span class="pill" style="color:#7c3aed"><span class="dot"></span>Recipe of the week</span>
            <h1 class="jc-h">Cook anything.<br>We'll show you<br><span class="accent">every step.</span></h1>
            <p class="lede">Short, no-nonsense cooking videos with the full recipe right beside them — times, ingredients and gear, all in one place.</p>
            <div class="hero-actions">
              <button class="btn btn-dark" data-play="${FEATURED.id}">
                <span style="width:16px;height:16px;border-radius:50%;background:#f24e1e;display:inline-flex;align-items:center;justify-content:center"><span style="width:0;height:0;border-left:5px solid #fff;border-top:3.5px solid transparent;border-bottom:3.5px solid transparent;margin-left:1px"></span></span>
                Watch the recipe
              </button>
              <button class="btn btn-ghost" data-act="library">Browse recipes</button>
            </div>
            <div class="hero-stats">
              <div class="stat-chip sc-orange"><span class="k">Total time</span><span class="v">35 min</span></div>
              <div class="stat-chip sc-green"><span class="k">Serves</span><span class="v">4 people</span></div>
              <div class="stat-chip sc-blue"><span class="k">Level</span><span class="v">Easy</span></div>
            </div>
          </div>
          <div class="hero-video">
            ${addLoaderCardHTML({ heading: "Paste a cooking video", sub: "Drop a link — we'll pull the video in and extract the full structured recipe." })}
            <div class="sticker" style="bottom:-16px;left:-22px"><span class="tile">🧾</span><div><div class="k">EXTRACTED</div><div class="v">Ingredients + steps</div></div></div>
            <div class="cursor" style="bottom:-14px;right:24px;animation:drift1 6s ease-in-out infinite"><svg width="20" height="20" viewBox="0 0 24 24" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))"><path d="M4 2l15 8.5-6.4 1.6L9.6 19 4 2z" fill="#a259ff"/></svg><span style="background:#a259ff">Chef Mia</span></div>
            <div class="cursor" style="top:38%;right:-30px;animation:drift2 7.5s ease-in-out infinite"><svg width="20" height="20" viewBox="0 0 24 24" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))"><path d="M4 2l15 8.5-6.4 1.6L9.6 19 4 2z" fill="#0d99ff"/></svg><span style="background:#0d99ff">Dad</span></div>
          </div>
        </div>
        <div style="margin-top:34px">${marqueeHTML()}</div>
      </section>

      <section class="sec" data-reveal>
        <div class="sec-head"><div style="display:flex;align-items:center;gap:10px"><span style="font-size:22px">🔥</span><h2>Most popular this week</h2></div><span class="link-more" data-act="library">View all →</span></div>
        <div class="rail">${popular.map((r) => recipeCardHTML(r, { rankPill: true })).join("")}</div>
      </section>

      <section class="sec" data-reveal>
        <div class="sec-head"><div><h2>Fresh from the kitchen</h2><p>New cooks added every week — here's what's playing now.</p></div><span class="link-more" data-act="library">All recipes →</span></div>
        <div class="grid">${browse.map((r) => recipeCardHTML(r)).join("")}</div>
      </section>

      ${homeFeaturesHTML()}
      ${footerCTAHTML()}
    </main>
    ${footerHTML()}`;
  }

  function homeFeaturesHTML() {
    const F = [
      { ic: FI.link, c: "#1a86ff", bg: "#f0f6ff", t: "Paste any link", d: "Drop in a video from any major platform and it plays right inside the recipe.", logos: true },
      { ic: FI.check, c: "#0f9d63", bg: "#eefaf3", t: "Smart ingredient list", d: "Tap to check things off as you gather them, grouped by component so nothing gets missed." },
      { ic: FI.clock, c: "#e0821e", bg: "#fff6ec", t: "Timecoded steps", d: "Every step is pinned to the exact moment in the video — tap and jump straight there." },
      { ic: FI.details, c: "#8b5cf6", bg: "#f6f0ff", t: "Details up front", d: "Prep, cook and total time, servings and the exact gear you need — no scrolling to hunt for it." },
      { ic: FI.pan, c: "#ef4a2a", bg: "#fff5f0", t: "Cook mode", d: "A distraction-free view that keeps your screen awake while your hands are covered in flour." },
      { ic: FI.save, c: "#6d5ae6", bg: "#f3edff", t: "Save & collect", d: "Bookmark recipes into collections and pick up right where you left off, on any device." },
    ];
    return `
    <section class="sec features" data-reveal>
      <div class="intro">
        <span class="kicker">WHY RECIPEREEL</span>
        <h2 class="jc-h">Cooking videos, minus the faff</h2>
        <p>Everything you need to actually cook the dish — pulled together on one clean, tappable page.</p>
      </div>
      <div class="feature-grid">
        ${F.map((f) => `
          <div class="feature">
            <div class="fi" style="background:${f.bg};color:${f.c}">${f.ic}</div>
            <h3>${f.t}</h3><p>${f.d}</p>
            ${f.logos ? `<div class="logos">${PLATFORMS.map((p) => `<span style="width:20px;height:20px;display:inline-block">${LOGOS[p.key]}</span>`).join("")}</div>` : ""}
          </div>`).join("")}
      </div>
      <div class="amd-strip">
        Heavy perception runs on <b>AMD MI300X</b> <span class="tag red">AMD</span> — Whisper + Qwen2.5-VL on ROCm — and recipe synthesis uses <b>Gemma</b>. Every quantity is tagged <b>spoken</b>, <b>on-screen</b> or <b>inferred</b>, never invented.
      </div>
    </section>`;
  }
  const footerCTAHTML = () => `
    <section class="footer-cta" data-reveal>
      <h2 class="jc-h">Cooked it? Share your slice.</h2>
      <p>Upload your own video, tag your recipe, and it could be next week's featured cook on RecipeReel.</p>
      <button class="btn btn-dark" data-act="add">Submit your recipe</button>
    </section>`;

  /* ===================================================================
     DESKTOP: LIBRARY
     =================================================================== */
  function libraryHTML(savedMode) {
    return `
    ${desktopHeader("library")}
    <main class="wrap" style="padding-top:clamp(28px,5vw,44px)">
      <div data-reveal class="in">
        <span class="pill" style="color:#f24e1e">🍳 ${RECIPES.length} recipes and counting</span>
        <h1 class="jc-h" style="margin:16px 0 0;font-size:clamp(34px,6vw,52px);line-height:1;letter-spacing:-.03em;font-weight:700">${savedMode ? "Your saved cooks" : "Find your next cook"}</h1>
        <p style="margin:14px 0 0;font-size:clamp(15px,2vw,17px);line-height:1.55;color:var(--muted);max-width:520px">Search the library, browse what everyone's making, or filter by how much of a challenge you're in the mood for.</p>
        <div class="search-box">
          ${IC.search.replace('stroke="currentColor"', 'stroke="#b0aca5"')}
          <input id="lib-search" type="text" placeholder="Search recipes, ingredients, cuisines…" value="${h(state.query)}">
          <button class="clear" id="lib-clear" style="${state.query ? "" : "display:none"}">✕</button>
        </div>
        <div class="suggests">
          ${["Pizza", "Italian", "Quick & easy", "Baking", "Japanese"].map((s) => `<button data-suggest="${s === "Quick & easy" ? "easy" : s}">${s}</button>`).join("")}
        </div>
      </div>
      <section class="sec" id="popular-sec" style="margin-top:clamp(36px,5vw,52px)">
        <div class="sec-head" style="margin-bottom:18px"><div style="display:flex;align-items:center;gap:10px"><span style="font-size:22px">🔥</span><h2>Most popular this week</h2></div></div>
        <div class="rail">${RECIPES.filter((r) => r.popular).map((r) => recipeCardHTML(r, { rankPill: true })).join("")}</div>
      </section>
      <section class="sec" style="margin-top:clamp(36px,5vw,52px)">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:22px">
          <h2 class="jc-h" id="grid-heading" style="margin:0;font-size:clamp(22px,3vw,28px);font-weight:700;letter-spacing:-.02em"></h2>
          <div class="filter-tabs" id="filter-tabs"></div>
        </div>
        <div id="results"></div>
      </section>
    </main>
    ${footerHTML()}`;
  }
  function filterCounts() {
    const q = state.query.trim().toLowerCase();
    const matchQ = (r) => !q || (r.name + " " + r.cuisine + " " + r.difficulty).toLowerCase().includes(q);
    const c = { all: RECIPES.filter(matchQ).length };
    ["easy", "medium", "hard"].forEach((d) => (c[d] = RECIPES.filter((r) => matchQ(r) && r.difficulty.toLowerCase() === d).length));
    return c;
  }
  function renderFilterTabs() {
    const tabs = $("#filter-tabs"); if (!tabs) return;
    const counts = filterCounts();
    const defs = [{ k: "all", l: "All", dot: null }, { k: "easy", l: "Easy", dot: "#09a866" }, { k: "medium", l: "Medium", dot: "#e08422" }, { k: "hard", l: "Hard", dot: "#e0341a" }];
    tabs.innerHTML = defs.map((d) => `
      <button data-filter="${d.k}" class="${state.filter === d.k ? "active" : ""}">
        ${d.dot ? `<span class="fdot" style="background:${d.dot}"></span>` : ""}${d.l}<span class="fcount">${counts[d.k]}</span>
      </button>`).join("");
  }
  function renderResults() {
    const box = $("#results"); if (!box) return;
    const q = state.query.trim().toLowerCase(), f = state.filter;
    const matchQ = (r) => !q || (r.name + " " + r.cuisine + " " + r.difficulty).toLowerCase().includes(q);
    const matchF = (r) => f === "all" || r.difficulty.toLowerCase() === f;
    const list = RECIPES.filter((r) => matchQ(r) && matchF(r));
    const labels = { all: "All recipes", easy: "Easy recipes", medium: "Medium recipes", hard: "Hard recipes" };
    const heading = $("#grid-heading");
    if (heading) heading.textContent = q ? `${list.length} result${list.length === 1 ? "" : "s"} for "${state.query.trim()}"` : labels[f];
    const popSec = $("#popular-sec"); if (popSec) popSec.style.display = q ? "none" : "";
    if (!list.length) {
      box.innerHTML = `<div class="empty"><div style="font-size:44px">🍽️</div><h3>No recipes found</h3><p>Nothing matches "${h(state.query.trim())}"${f === "all" ? "" : " in " + f}. Try another search or filter.</p><button class="btn btn-dark" id="reset-lib">Reset filters</button></div>`;
      return;
    }
    box.innerHTML = `<div class="grid">${list.map((r) => recipeCardHTML(r)).join("")}</div>`;
  }

  /* ===================================================================
     DESKTOP: RECIPE DETAIL
     =================================================================== */
  function recipeHTML() {
    const r = recipeContent(byId(state.recipeId) || FEATURED);
    return `
    ${desktopHeader()}
    <main class="wrap" style="padding-bottom:80px">
      <div class="detail-hero">
        <span class="pill" style="color:#f24e1e">${r.extracted ? "✨" : "🍕"} ${h(r.episode || FEATURED.episode)} · by ${h(r.channel)}</span>
        <h1 class="jc-h">${titleHTML(r)}</h1>
        <p class="lede">${h(r.description)}</p>
      </div>
      <div class="video-zone" id="video-zone">${videoZoneHTML(r)}</div>
      ${detailBarHTML(r)}
      <div style="margin:16px auto 0;max-width:900px">${marqueeHTML()}</div>
      <div class="cook-layout">
        ${ingredientsHTML(r)}
        <div class="method">
          <div class="method-head"><h2>Method</h2><span class="method-count" id="steps-count"></span></div>
          <p class="method-sub">Tap the timecode to jump the video · tap a card to mark it done</p>
          <div class="steps">${r.steps.map((s, i) => stepHTML(r, s, i)).join("")}</div>
          ${equipmentHTML(r)}
        </div>
      </div>
      ${r.extracted ? extractedMetaHTML(r) : ""}
      ${homeFeaturesHTML()}
      <section class="sec"><div class="sec-head"><div><h2>More from the kitchen</h2><p>Fresh cooks added every week — here's what's playing now.</p></div><span class="link-more" data-act="library">View all recipes →</span></div>
        <div class="grid">${RECIPES.filter((x) => x.id !== r.id).slice(0, 3).map((x) => recipeCardHTML(x)).join("")}</div></section>
      ${footerCTAHTML()}
    </main>
    ${footerHTML()}`;
  }
  function videoZoneHTML(r) {
    if (state.video) {
      return `
      <div class="video-frame">
        <iframe id="rc-iframe" src="${embedSrc(state.video.base, state.video.type, 0)}" title="Recipe video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        <button class="change" id="rc-change"><span class="dot"></span>${h(state.video.platform)} · Change</button>
      </div>
      ${videoDecorHTML(r)}`;
    }
    const suggest = r.video ? "https://youtu.be/" + r.video : "https://youtube.com/watch?v=";
    return `
    <div class="loader-card">
      <div class="loader-tabs">
        <button class="active" data-loadertab="link">Paste a link</button>
        <button data-loadertab="upload">Upload a file</button>
      </div>
      <div class="loader-body" id="loader-body">
        <div class="icon"><span class="ring"></span><span class="disc"><span class="play-tri"></span></span></div>
        <h3 class="jc-h">Add the recipe video</h3>
        <p>Paste a link from YouTube, Vimeo, Instagram, Facebook or TikTok — we'll embed it right here${r.video ? " (the featured cook is pre-filled)" : ""}.</p>
        <div class="url-input">
          ${IC.link}
          <input id="rc-url" type="text" placeholder="https://youtube.com/watch?v=…" value="${r.video ? h(suggest) : ""}">
          <button id="rc-load">Load</button>
        </div>
        <div id="rc-err"></div>
        <div class="platform-row">
          ${PLATFORMS.map((p) => `<span class="platform-chip"><span style="width:17px;height:17px;display:inline-block">${LOGOS[p.key]}</span>${p.label}</span>`).join("")}
        </div>
      </div>
    </div>
    ${videoDecorHTML(r)}`;
  }
  const videoDecorHTML = (r) => `
    <div class="decor-ready"><div class="k">READY IN</div><div class="v">${h((r && r.time) || "35 min")}</div></div>
    <div class="cursor" style="bottom:-14px;right:46px;animation:drift1 7s ease-in-out infinite;z-index:5"><svg width="22" height="22" viewBox="0 0 24 24" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))"><path d="M4 2l15 8.5-6.4 1.6L9.6 19 4 2z" fill="#a259ff"/></svg><span style="background:#a259ff">Chef Mia</span></div>`;
  const statVal = (v) => (v != null && v !== "" ? `${h(v)}<span class="u">min</span>` : "—");
  function detailBarHTML(r) {
    return `
    <div class="detail-bar">
      <div class="stat prep"><div class="k">PREP</div><div class="v">${statVal(r.prep)}</div></div>
      <div class="stat cook"><div class="k">COOK</div><div class="v">${statVal(r.cook)}</div></div>
      <div class="stat total"><div class="k">TOTAL</div><div class="v">${statVal(r.total)}</div></div>
      <div class="stat serves"><div class="k">SERVES</div><div class="v">${h(r.serves)}<span class="u">people</span></div></div>
      <div class="stat level"><div class="k">LEVEL</div><div class="v">${h(r.difficulty)}</div></div>
    </div>`;
  }
  /* Extraction transparency: what actually ran (AMD compute story) + tips/caveats. */
  function extractedMetaHTML(r) {
    const p = r.processing || {};
    const dev = p.device === "cuda" ? (p.gpu_name || "AMD MI300X (ROCm)") : cap(p.device || "cpu");
    const chips = [];
    if (r.confidence != null) chips.push(`Confidence: <b>${r.confidence}%</b>`);
    if (p.synthesizer) chips.push(`Synthesis: <b>${h(p.synthesizer)}</b>`);
    if (p.vision && p.vision !== "none") chips.push(`Vision: <b>${h(p.vision)}</b>`);
    if (p.transcriber && p.transcriber !== "none") chips.push(`ASR: <b>${h(p.transcriber)}</b>`);
    chips.push(`Device: <b>${h(dev)}</b>`);
    if (p.frames_analyzed) chips.push(`<b>${p.frames_analyzed}</b> frames`);
    if (p.elapsed_seconds != null) chips.push(`<b>${p.elapsed_seconds}s</b>`);
    const warn = (r.warnings || []).length
      ? `<div class="ex-note-strip warn">⚠ ${r.warnings.map(h).join(" · ")}</div>` : "";
    const tips = (r.tips || []).length
      ? `<div class="ex-note-strip"><b>Tips</b><ul>${r.tips.map((t) => `<li>${h(t)}</li>`).join("")}</ul></div>` : "";
    return `
    <section class="sec">
      <div class="amd-strip" style="justify-content:flex-start;gap:8px">
        <span class="tag red">AMD</span><span>Extracted with</span> ${chips.join(" · ")}
      </div>
      ${warn}${tips}
    </section>`;
  }
  function ingredientsHTML(r) {
    const set = checkedSet(r.id);
    let total = 0;
    const groups = r.ingredientGroups.map((g, gi) => {
      const rows = g.items.map((it, ii) => {
        total++;
        const key = gi + "-" + ii, on = set.has(key);
        return `
        <div class="ing-row ${on ? "done" : ""}" data-ing="${key}">
          <span class="tile" style="background:${g.bg}">${it.emoji}</span>
          <span class="txt"><span class="amt">${h(it.amt)}</span> <span class="nm">${h(it.name)}</span>${provHTML(it.src)}</span>
          <span class="box" style="${on ? `border-color:${g.color};background:${g.color}` : ""}">${on ? "✓" : ""}</span>
        </div>`;
      }).join("");
      return `<div class="ing-group"><div class="g-title"><span class="sq" style="background:${g.color}"></span><span class="lbl" style="color:${g.color}">${h(g.title)}</span></div>${rows}</div>`;
    }).join("");
    return `
    <div class="ingredients">
      <div class="ing-head"><h2>Ingredients</h2><span class="ing-count" id="ing-count">${set.size}/${total} gathered</span></div>
      <p class="ing-sub">Tap an item to check it off</p>
      ${groups}
    </div>`;
  }
  function stepHTML(r, s, i) {
    const done = doneSet(r.id).has(i);
    const live = !!state.video;
    const photo = s.photo
      ? `<div class="photo"><img src="${s.photo}" alt="${h(s.t)}" loading="lazy"></div>`
      : `<div class="photo ph" style="background:linear-gradient(135deg,${s.c},${s.c}33)"><span>${i + 1}</span></div>`;
    return `
    <div class="step ${done ? "done" : ""}" data-step="${i}">
      ${photo}
      <div class="sbody">
        <div class="srow">
          <div class="num" style="background:${s.c}">${done ? "✓" : i + 1}</div>
          <h3>${h(s.t)}</h3>
          <button class="tc ${live ? "live" : ""}" data-seek="${s.start}"><span style="font-size:9px">▶</span>${h(s.tc)}</button>
          <span class="dur">⏱ ${h(s.time)}</span>
        </div>
        <p class="desc">${h(s.d)}</p>
      </div>
    </div>`;
  }
  function equipmentHTML(r) {
    return `
    <div class="equipment">
      <div class="eh"><span style="font-size:18px">🍳</span><h2>Equipment you'll need</h2></div>
      <div class="tags">${r.equipment.map((e) => `<span>${e}</span>`).join("")}</div>
    </div>`;
  }

  /* ===================================================================
     MOBILE SHELL
     =================================================================== */
  function tabbarHTML(active) {
    const b = (key, icon, act) => `<button class="${active === key ? "active" : ""}" data-tab="${act}">${icon}</button>`;
    return `
    <nav class="tabbar">
      ${b("discover", IC.home, "discover")}
      ${b("search", IC.search, "search")}
      <button class="add" data-tab="add">${IC.plus}</button>
      ${b("saved", IC.bookmark, "saved")}
      ${b("profile", IC.user, "profile")}
    </nav>`;
  }

  /* MOBILE: Discover */
  function discoverHTML() {
    const chips = ["🔥 Trending", "⚡ 15-min", "🥗 Veggie", "🥐 Baking"];
    const popular = RECIPES.filter((r) => r.popular).slice(1, 4);
    return `
    <div class="m-app">
      <div class="m-screen">
        <div class="m-pad m-safetop">
          <div class="m-greeting">Good evening, Sam 👋</div>
          <h2 class="m-h1">What's cooking?</h2>
          <div class="m-search" data-tab="search"><span style="display:inline-flex">${IC.searchSm}</span><span class="ph">Search 5,000+ recipes</span></div>
          <div class="m-chips">${chips.map((c, i) => `<span class="m-chip ${i === 0 ? "active" : ""}">${c}</span>`).join("")}</div>

          <div class="m-kicker hot">Recipe of the week</div>
          <div class="m-feature" data-play="${FEATURED.id}">
            <img src="${FEATURED.poster}" alt="${h(FEATURED.name)}">
            <div class="scrim"></div>
            <div style="position:absolute;top:12px;right:12px;background:rgba(0,0,0,.6);color:#fff;font-size:11px;font-weight:600;padding:4px 9px;border-radius:7px">12:45</div>
            <div class="center-play"><span class="play-tri"></span></div>
            <div class="cap"><div class="t">Classic Pepperoni Pizza</div><div class="tags"><span>⏱ 35 min</span><span>Serves 4</span><span>Easy</span></div></div>
          </div>

          <div class="m-kicker">Popular now</div>
          <div class="m-list">${popular.map(mItemHTML).join("")}</div>
        </div>
      </div>
    </div>
    ${tabbarHTML("discover")}`;
  }
  function mItemHTML(r) {
    return `
    <div class="m-item" data-card="${r.id}">
      <div class="thumb"><img src="${r.poster}" alt="${h(r.name)}" loading="lazy"${posterErr(r)}></div>
      <div class="info"><div class="t">${h(r.name)}</div><div class="s">⏱ ${h(r.time)} · Serves ${h(r.serves)} · ${h(r.difficulty)}</div></div>
    </div>`;
  }

  /* MOBILE: Search / Browse */
  function searchHTML() {
    const q = state.query.trim().toLowerCase();
    const list = q ? RECIPES.filter((r) => (r.name + " " + r.cuisine).toLowerCase().includes(q)) : [];
    return `
    <div class="m-app">
      <div class="m-screen">
        <div class="m-pad m-safetop">
          <h2 class="m-h1" style="margin-bottom:14px">Browse</h2>
          <div class="m-search"><span style="display:inline-flex">${IC.searchSm}</span><input id="m-search-input" type="text" placeholder="Search recipes, cuisines…" value="${h(state.query)}"></div>
          <div id="m-results">
            ${q ? mSearchResults(list) : mBrowseDefault()}
          </div>
        </div>
      </div>
    </div>
    ${tabbarHTML("search")}`;
  }
  function mBrowseDefault() {
    return `
      <div class="m-kicker">Categories</div>
      <div class="m-cat-grid">
        ${CATEGORIES.map((c) => `<div class="m-cat" data-suggest="${c.q}" style="background:${c.grad}"><div class="t">${c.t}</div><div class="s">${c.s}</div><div class="big">${c.emoji}</div></div>`).join("")}
      </div>
      <div class="m-kicker">Cuisines</div>
      <div class="m-cuisines">${CUISINES.map((c) => `<span data-suggest="${c.split(" ")[1]}">${c}</span>`).join("")}</div>
      <div class="m-kicker">Trending recipes</div>
      <div class="m-list">${RECIPES.filter((r) => r.popular).map(mItemHTML).join("")}</div>`;
  }
  function mSearchResults(list) {
    if (!list.length) return `<div style="text-align:center;padding:50px 10px;color:var(--muted-2)"><div style="font-size:40px">🍽️</div><div class="jc-h" style="font-size:18px;font-weight:700;margin-top:10px">No recipes found</div></div>`;
    return `<div class="m-kicker">${list.length} result${list.length === 1 ? "" : "s"}</div><div class="m-list">${list.map(mItemHTML).join("")}</div>`;
  }

  const mStatVal = (v) => (v != null && v !== "" ? `${h(v)}m` : "—");
  function metaLine(r) {
    const parts = [];
    if (r.rating) parts.push("★ " + h(r.rating));
    if (r.confidence != null) parts.push(h(r.confidence) + "% confident");
    if (r.cooks) parts.push(h(r.cooks) + " cooks");
    parts.push("by " + h(r.channel));
    return parts.join(" · ");
  }

  /* MOBILE: Recipe detail */
  function recipeMobileHTML() {
    const r = recipeContent(byId(state.recipeId) || FEATURED);
    if (state.cook) return cookModeHTML(r);
    const seg = state.seg;
    const heroInner = state.video
      ? `<iframe src="${embedSrc(state.video.base, state.video.type, 0)}" title="video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="width:100%;height:100%;border:0"></iframe>`
      : `<img src="${r.poster}" alt="${h(r.name)}"${posterErr(r)}>
         <div class="scrim"></div>
         <div class="center-play" data-mplay="1"><div class="play-btn"><span class="ring"></span><span class="play-tri"></span></div></div>
         <div style="position:absolute;bottom:12px;right:12px;background:rgba(0,0,0,.6);color:#fff;font-size:11px;font-weight:600;padding:4px 9px;border-radius:7px">12:45</div>`;
    return `
    <div class="m-app">
      <div class="m-screen">
        <div class="m-rhero">
          ${heroInner}
          <div class="m-round" style="top:calc(56px + env(safe-area-inset-top,0px));left:16px" data-act="back">${IC.back}</div>
          <div class="m-round" style="top:calc(56px + env(safe-area-inset-top,0px));right:16px">${IC.bookmark.replace('stroke="currentColor"', 'stroke="#1e1e1e"')}</div>
        </div>
        <div class="m-pad">
          <span class="m-eyebrow">${r.extracted ? "✨" : "🍕"} ${h(r.episode || FEATURED.episode)}</span>
          <h2 class="m-rtitle">${h(r.name)}</h2>
          <div class="m-rmeta">${metaLine(r)}</div>
          <div class="m-statgrid">
            <div class="m-stat prep"><div class="k">PREP</div><div class="v">${mStatVal(r.prep)}</div></div>
            <div class="m-stat cook"><div class="k">COOK</div><div class="v">${mStatVal(r.cook)}</div></div>
            <div class="m-stat serves"><div class="k">SERVES</div><div class="v">${h(r.serves)}</div></div>
            <div class="m-stat level"><div class="k">LEVEL</div><div class="v">${h(r.difficulty)}</div></div>
          </div>
          <div class="m-seg">
            <button class="${seg === "ingredients" ? "active" : ""}" data-seg="ingredients">Ingredients</button>
            <button class="${seg === "method" ? "active" : ""}" data-seg="method">Method</button>
          </div>
          <div id="m-seg-body">${seg === "ingredients" ? mIngredientsHTML(r) : mMethodHTML(r)}</div>
        </div>
      </div>
    </div>
    <div class="m-cta"><button class="btn btn-dark" data-act="cook">▶ Start cooking</button></div>
    ${tabbarHTML("")}`;
  }
  function mIngredientsHTML(r) {
    const set = checkedSet(r.id);
    let idx = -1;
    const rows = r.ingredientGroups.map((g, gi) => g.items.map((it, ii) => {
      const key = gi + "-" + ii, on = set.has(key);
      return `
      <div class="m-ing-row ${on ? "done" : ""}" data-ming="${key}">
        <span class="tile" style="background:${g.bg}">${it.emoji}</span>
        <span class="txt"><span class="amt">${h(it.amt)}</span> ${h(it.name)}${provHTML(it.src)}</span>
        <span class="box">${on ? "✓" : ""}</span>
      </div>`;
    }).join("")).join("");
    return `<div class="m-ing">${rows}</div>`;
  }
  function mMethodHTML(r) {
    return `
    <div class="m-kicker" style="margin-top:16px">Method · tap a timecode to jump</div>
    <div class="m-list">${r.steps.map((s, i) => mStepHTML(r, s, i)).join("")}</div>`;
  }
  function mStepHTML(r, s, i) {
    const done = doneSet(r.id).has(i);
    const photo = s.photo
      ? `<div class="photo"><img src="${s.photo}" alt="${h(s.t)}" loading="lazy"></div>`
      : `<div class="photo ph" style="background:linear-gradient(135deg,${s.c},${s.c}33)"></div>`;
    return `
    <div class="m-step ${done ? "done" : ""}" data-step="${i}">
      <div class="num" style="background:${s.c}">${done ? "✓" : i + 1}</div>
      ${photo}
      <div class="b"><div class="top"><b>${h(s.t)}</b><span class="tc" data-seek="${s.start}">▶ ${h(s.tc)}</span></div><div class="d">${h(s.d)}</div></div>
    </div>`;
  }

  /* MOBILE: Cook mode */
  function cookModeHTML(r) {
    const done = doneSet(r.id);
    const active = Math.min(state.activeStep, r.steps.length - 1);
    const cur = r.steps[active];
    const videoInner = state.video
      ? `<iframe id="cook-iframe" src="${embedSrc(state.video.base, state.video.type, cur.start)}" title="video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="width:100%;height:100%;border:0"></iframe>`
      : `<img src="${r.poster}" alt="${h(r.name)}"${posterErr(r)}><div class="scrim"></div>
         <div class="chap">Chapter ${active + 1} · ${h(cur.t)}</div>
         <div class="center-play" data-mplay="1"><span class="play-tri"></span></div>
         <div class="barwrap"><div class="bg"><div class="fill" style="width:${Math.round(((active + 1) / r.steps.length) * 100)}%"></div></div><div class="times"><span>${h(cur.tc)}</span><span>${h(r.duration)}</span></div></div>`;
    return `
    <div class="m-app">
      <div class="m-screen">
        <div class="m-cook-video"><div class="frame">${videoInner}
          <div class="m-cook-back m-round" data-act="back">${IC.back}</div>
        </div></div>
        <div class="m-pad">
          <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px"><h2 class="jc-h" style="margin:0;font-size:24px;font-weight:700;letter-spacing:-.02em">Method</h2><span class="method-count">Step ${active + 1} of ${r.steps.length}</span></div>
          <p style="margin:0 0 16px;font-size:13px;color:var(--faint)">Tap a timecode to jump the video</p>
          <div class="m-list">${r.steps.map((s, i) => mStepHTML(r, s, i)).join("")}</div>
        </div>
      </div>
    </div>
    <div class="m-cta with-audio">
      <div class="audio">🔊</div>
      <button class="btn btn-dark" data-act="nextstep" style="flex:1;justify-content:center;padding:15px">${active >= r.steps.length - 1 ? "Finish ✓" : "Next step →"}</button>
    </div>
    ${tabbarHTML("")}`;
  }

  /* MOBILE: Saved */
  function savedHTML() {
    const collections = [
      { t: "Weeknight", s: "18 recipes", img: RECIPES[0].poster },
      { t: "Baking", s: "9 recipes", img: byId("butter-croissants").poster },
      { t: "Desserts", s: "12 recipes", img: byId("molten-lava-cake").poster },
    ];
    const recent = [RECIPES[0], byId("molten-lava-cake"), byId("thai-green-curry")];
    return `
    <div class="m-app"><div class="m-screen"><div class="m-pad m-safetop">
      <h2 class="m-h1" style="margin-bottom:14px">Saved</h2>
      <div class="m-collections">
        ${collections.map((c) => `<div class="m-collection"><img src="${c.img}" alt="${h(c.t)}"><div class="scrim"></div><div class="cap"><div class="t">${h(c.t)}</div><div class="s">${h(c.s)}</div></div></div>`).join("")}
      </div>
      <div class="m-kicker">Recently saved</div>
      <div class="m-list">
        ${recent.map((r) => `
        <div class="m-item" data-card="${r.id}">
          <div class="thumb"><img src="${r.poster}" alt="${h(r.name)}"${posterErr(r)}></div>
          <div class="info"><div class="t">${h(r.name)}</div><div class="s">⏱ ${h(r.time)} · Serves ${h(r.serves)}</div></div>
          <span style="display:inline-flex">${IC.bookmarkFill}</span>
        </div>`).join("")}
      </div>
    </div></div></div>
    ${tabbarHTML("saved")}`;
  }

  /* MOBILE + DESKTOP: Add via link */
  function addHTML() {
    if (!isMobile()) {
      // desktop add = focused paste experience
      return `
      ${desktopHeader()}
      <main class="wrap" style="padding:clamp(40px,7vw,80px) 0;max-width:760px">
        <div class="detail-hero" style="padding-top:0">
          <span class="pill" style="color:#7c3aed"><span class="dot"></span>New recipe</span>
          <h1 class="jc-h">Paste a cooking video</h1>
          <p class="lede">Drop a link from YouTube, Vimeo, Instagram, Facebook or TikTok. We'll pull the video in, then extract the structured recipe.</p>
        </div>
        <div class="video-zone" id="video-zone" style="margin-top:28px">
          ${addLoaderCardHTML()}
        </div>
      </main>${footerHTML()}`;
    }
    return `
    <div class="m-app"><div class="m-screen"><div class="m-pad" style="padding-top:calc(52px + env(safe-area-inset-top,0px))">
      <div class="m-topbar"><span class="cancel" data-tab="discover">Cancel</span><span class="title">Add a video</span><span class="save">Save</span></div>
      <h2 class="jc-h" style="margin:22px 0 6px;font-size:24px;font-weight:700;letter-spacing:-.02em">Paste a video link</h2>
      <p style="margin:0 0 16px;font-size:14px;color:var(--muted-2)">We'll pull in the video and let you add ingredients &amp; steps.</p>
      <div class="m-url">${IC.link}<input id="add-url" type="text" placeholder="youtube.com/watch?v=…"><button id="add-load" class="btn btn-dark" style="padding:8px 14px">Load</button></div>
      <div id="add-err"></div>
      ${ingestNoticeHTML()}
      <div class="m-kicker">Works with</div>
      <div class="m-platform-grid">
        ${PLATFORMS.map((p) => `<div class="m-platform"><span style="width:26px;height:26px;display:inline-block">${LOGOS[p.key]}</span><span>${p.label === "Instagram" ? "Insta" : p.label === "Facebook" ? "FB" : p.label}</span></div>`).join("")}
      </div>
      <div class="m-upload">${IC.upload}Or upload from device</div>
    </div></div></div>
    ${tabbarHTML("add")}`;
  }

  /* ===================================================================
     LIVE EXTRACTION — progress screen (what the user sees while the
     backend turns the pasted video into a real, structured recipe).
     =================================================================== */
  const EX_STAGES = [
    ["ingesting", "Fetching the video"],
    ["extracting_audio", "Extracting audio"],
    ["sampling_frames", "Sampling keyframes"],
    ["transcribing", "Transcribing speech · Whisper on MI300X"],
    ["analyzing_frames", "Reading on-screen text · Qwen2.5-VL on MI300X"],
    ["synthesizing", "Structuring the recipe · Gemma"],
    ["validating", "Validating quantities"],
    ["done", "Recipe ready"],
  ];
  const EX_ORDER = EX_STAGES.map((s) => s[0]);
  function exStagesHTML(cur) {
    const ci = Math.max(0, EX_ORDER.indexOf(cur));
    return EX_STAGES.map(([key, label], i) => {
      const st = cur === "done" || i < ci ? "done" : i === ci ? "active" : "pending";
      const mark = st === "done" ? "✓" : st === "active" ? '<span class="mini-spin"></span>' : i + 1;
      return `<li class="ex-stage ${st}"><span class="mk">${mark}</span><span class="lb">${label}</span></li>`;
    }).join("");
  }
  function extractViewHTML() {
    const j = state.extractJob;
    if (!j) {
      return `<div class="extract-screen"><div class="extract-card"><div class="ex-side">
        <div class="ex-head jc-h">Nothing to extract yet</div>
        <p class="ex-sub">Paste a cooking video link and we'll pull out the full recipe.</p>
        <div class="ex-actions"><button class="btn btn-dark" data-act="add">Paste a link</button>
        <button class="btn btn-ghost" data-act="home">Back home</button></div>
      </div></div></div>`;
    }
    const info = j.info;
    const media = info
      ? `<iframe id="ex-iframe" src="${embedSrc(info.base, info.type, 0)}" title="Pasted video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      : `<div class="ex-novid">🎬</div>`;
    const err = j.phase === "error";
    return `
    <div class="extract-screen">
      <div class="extract-card ${err ? "is-error" : ""}">
        <div class="ex-video">${media}${info ? `<span class="ex-plat"><span class="dot"></span>${h(info.platform)}</span>` : ""}</div>
        <div class="ex-side">
          <div class="ex-brand">${brandHTML}</div>
          <div class="ex-head jc-h">${err ? "Couldn't finish the extraction" : "Extracting your recipe"}</div>
          <p class="ex-sub" id="ex-sub">${err
            ? h(j.error || "Something went wrong.")
            : "Reading the video with Whisper + Qwen2.5-VL on AMD MI300X, then structuring it with Gemma. Quantities are tagged by source, never invented."}</p>
          ${err ? "" : `
          <div class="ex-prog"><div class="track"><div class="fill" id="ex-fill" style="width:${j.pct || 4}%"></div></div><div class="pct" id="ex-pct">${Math.round(j.pct || 4)}%</div></div>
          <ul class="ex-stages" id="ex-stages">${exStagesHTML(j.stageKey)}</ul>`}
          ${err ? `<div class="ex-actions"><button class="btn btn-dark" id="ex-retry">Try again</button><button class="btn btn-ghost" data-act="add">Upload a file instead</button><button class="btn btn-ghost" data-act="sample">See a sample recipe</button></div>` : ""}
        </div>
      </div>
    </div>`;
  }
  function wireExtract() {
    app().onclick = (e) => {
      const t = e.target.closest("[data-act],#ex-retry");
      if (!t) return;
      if (t.id === "ex-retry") {
        const j = state.extractJob;
        if (j) { j.phase = "running"; j.error = null; j.pct = 4; j.stageKey = "queued"; render(); runExtraction(); }
        return;
      }
      const act = t.getAttribute("data-act");
      if (act === "home") navigate("#/");
      else if (act === "add") navigate("#/add");
      else if (act === "sample") {
        const info = state.extractJob && state.extractJob.info;
        state.recipeId = FEATURED.id;
        state.video = info ? { base: info.base, type: info.type, platform: info.platform } : videoFromId(FEATURED.video);
        state.showPaste = false; state.seg = "ingredients"; state.cook = false; state.activeStep = 0;
        state.extractJob = null;
        navigate("#/recipe/" + FEATURED.id);
      }
    };
  }

  /* ===================================================================
     RENDER
     =================================================================== */
  function render() {
    const route = parseHash();
    state.view = route.view;
    if (route.view === "extract") {
      document.body.classList.toggle("is-mobile", isMobile());
      window.scrollTo(0, 0);
      app().innerHTML = extractViewHTML();
      wireExtract();
      return;
    }
    if (route.view === "recipe" && route.id) {
      const r = byId(route.id) || FEATURED;
      if (r.id !== state.recipeId) {
        state.recipeId = r.id;
        state.video = r.video ? videoFromId(r.video) : null;
        state.showPaste = !r.video; state.seg = "ingredients"; state.cook = false; state.activeStep = 0;
      } else if (!state.showPaste && !state.video && r.video) {
        // direct navigation to the current recipe: load its real video
        state.video = videoFromId(r.video);
      }
    }
    document.body.classList.toggle("is-mobile", isMobile());
    const root = app();
    window.scrollTo(0, 0);

    let inner;
    if (isMobile()) {
      state.tab = route.view === "library" ? "search" : route.view === "saved" ? "saved" : route.view === "add" ? "add" : route.view === "recipe" ? "" : "discover";
      if (route.view === "recipe") inner = recipeMobileHTML();
      else if (route.view === "library") inner = searchHTML();
      else if (route.view === "saved") inner = savedHTML();
      else if (route.view === "add") inner = addHTML();
      else if (route.view === "profile") inner = savedHTML();
      else inner = discoverHTML();
      root.innerHTML = '<div class="mobile">' + inner + "</div>";
    } else {
      if (route.view === "recipe") inner = recipeHTML();
      else if (route.view === "library") inner = libraryHTML();
      else if (route.view === "saved") inner = libraryHTML(true);
      else if (route.view === "add") inner = addHTML();
      else inner = homeHTML();
      root.innerHTML = '<div class="desktop">' + inner + "</div>";
    }
    wire();
    if (route.view === "library" && !isMobile()) { renderFilterTabs(); renderResults(); }
    if (route.view === "recipe") updateStepsCount();
    observeReveals();
  }

  /* ===================================================================
     WIRING (event delegation + targeted updates)
     =================================================================== */
  function wire() {
    const root = app();

    // delegated clicks
    root.onclick = (e) => {
      const t = e.target.closest("[data-act],[data-tab],[data-card],[data-play],[data-suggest],[data-seg],[data-loadertab],[data-ing],[data-ming],[data-step],[data-seek]");
      if (!t) return;

      if (t.hasAttribute("data-seek")) { e.stopPropagation(); seekTo(parseInt(t.getAttribute("data-seek"), 10)); return; }
      if (t.hasAttribute("data-ing")) { toggleIng(t, t.getAttribute("data-ing")); return; }
      if (t.hasAttribute("data-ming")) { toggleMIng(t, t.getAttribute("data-ming")); return; }
      if (t.hasAttribute("data-step")) { toggleStep(t, parseInt(t.getAttribute("data-step"), 10)); return; }
      if (t.hasAttribute("data-seg")) { state.seg = t.getAttribute("data-seg"); segSwitch(); return; }
      if (t.hasAttribute("data-loadertab")) { loaderTab(t.getAttribute("data-loadertab")); return; }

      const play = t.getAttribute("data-play"); if (play) { openRecipe(play, true); return; }
      const card = t.getAttribute("data-card"); if (card) { openRecipe(card, true); return; }
      const suggest = t.getAttribute("data-suggest"); if (suggest != null) { doSuggest(suggest); return; }

      const tab = t.getAttribute("data-tab");
      if (tab) { handleTab(tab); return; }

      const act = t.getAttribute("data-act");
      if (act === "home") navigate("#/");
      else if (act === "library") navigate("#/library");
      else if (act === "add") navigate("#/add");
      else if (act === "back") { state.cook ? (state.cook = false, render()) : history.length > 1 ? history.back() : navigate("#/"); }
      else if (act === "cook") { state.cook = true; state.activeStep = 0; render(); }
      else if (act === "nextstep") nextStep();
    };

    // recipe video load / change (buttons with ids)
    const loadBtn = $("#rc-load");
    if (loadBtn) {
      loadBtn.onclick = () => loadRecipeVideo($("#rc-url").value);
      const inp = $("#rc-url"); if (inp) inp.onkeydown = (e) => { if (e.key === "Enter") loadRecipeVideo(inp.value); };
    }
    const changeBtn = $("#rc-change");
    if (changeBtn) changeBtn.onclick = () => { state.video = null; state.showPaste = true; $("#video-zone").innerHTML = videoZoneHTML(recipeContent(byId(state.recipeId) || FEATURED)); wire(); };

    // library search
    const ls = $("#lib-search");
    if (ls) {
      ls.oninput = () => { state.query = ls.value; const c = $("#lib-clear"); if (c) c.style.display = ls.value ? "" : "none"; renderFilterTabs(); renderResults(); };
    }
    const lc = $("#lib-clear"); if (lc) lc.onclick = () => { state.query = ""; if (ls) { ls.value = ""; ls.focus(); } lc.style.display = "none"; renderFilterTabs(); renderResults(); };
    // filter tabs (delegated)
    const ft = $("#filter-tabs"); if (ft) ft.onclick = (e) => { const b = e.target.closest("[data-filter]"); if (!b) return; state.filter = b.getAttribute("data-filter"); renderFilterTabs(); renderResults(); };
    root.addEventListener("click", (e) => { if (e.target.id === "reset-lib") { state.query = ""; state.filter = "all"; if ($("#lib-search")) $("#lib-search").value = ""; render(); } });

    // mobile search
    const ms = $("#m-search-input");
    if (ms) ms.oninput = () => { state.query = ms.value; const box = $("#m-results"); const q = ms.value.trim().toLowerCase(); const list = RECIPES.filter((r) => (r.name + " " + r.cuisine).toLowerCase().includes(q)); box.innerHTML = q ? mSearchResults(list) : mBrowseDefault(); };

    // add-flow load → live extraction
    const addLoad = $("#add-load");
    if (addLoad) { addLoad.onclick = () => startExtraction($("#add-url").value); const ai = $("#add-url"); if (ai) ai.onkeydown = (e) => { if (e.key === "Enter") startExtraction(ai.value); }; }
    // captcha widget (proof-of-work verify button)
    const capBtn = $("#cap-check"); if (capBtn) capBtn.onclick = () => ensureCaptcha(true);

    // mobile hero play
    const mplay = $("[data-mplay]"); if (mplay) mplay.onclick = () => { const r = byId(state.recipeId) || FEATURED; if (r.video) { state.video = videoFromId(r.video); render(); } else toast("No video attached to this recipe yet"); };

    // card hover preview (desktop)
    if (!isMobile()) wireHoverPreview();
  }

  function wireHoverPreview() {
    $$(".recipe-card").forEach((card) => {
      card.onmouseenter = () => card.classList.add("previewing");
      card.onmouseleave = () => card.classList.remove("previewing");
    });
  }

  function handleTab(tab) {
    if (tab === "discover") navigate("#/");
    else if (tab === "search") navigate("#/library");
    else if (tab === "add") navigate("#/add");
    else if (tab === "saved") navigate("#/saved");
    else if (tab === "profile") navigate("#/saved");
  }
  function doSuggest(q) {
    state.query = q;
    if (state.view === "library" || isMobile()) {
      if (!isMobile()) { navigate("#/library"); const ls = $("#lib-search"); if (ls) ls.value = q; renderFilterTabs(); renderResults(); }
      else { navigate("#/library"); }
    } else navigate("#/library");
  }

  /* ---- targeted updates ---- */
  function toggleIng(row, key) {
    const set = checkedSet(state.recipeId);
    const on = !set.has(key); on ? set.add(key) : set.delete(key);
    row.classList.toggle("done", on);
    // recolor box using the group color from the tile's bg is complex; read from CSS var via group
    const box = row.querySelector(".box");
    const tile = row.querySelector(".tile");
    const grp = row.closest(".ing-group"); const color = grp ? getComputedStyle(grp.querySelector(".sq")).backgroundColor : "#f24e1e";
    if (on) { box.style.borderColor = color; box.style.background = color; box.textContent = "✓"; }
    else { box.style.borderColor = ""; box.style.background = ""; box.textContent = ""; }
    const cnt = $("#ing-count"); if (cnt) { const total = $$(".ing-row").length; cnt.textContent = `${set.size}/${total} gathered`; }
  }
  function toggleMIng(row, key) {
    const set = checkedSet(state.recipeId);
    const on = !set.has(key); on ? set.add(key) : set.delete(key);
    row.classList.toggle("done", on);
    row.querySelector(".box").textContent = on ? "✓" : "";
  }
  function toggleStep(card, i) {
    const set = doneSet(state.recipeId);
    const on = !set.has(i); on ? set.add(i) : set.delete(i);
    card.classList.toggle("done", on);
    const num = card.querySelector(".num");
    const step = (recipeContent(byId(state.recipeId) || FEATURED)).steps[i];
    num.textContent = on ? "✓" : i + 1;
    if (!on) num.style.background = step.c;
    updateStepsCount();
  }
  function updateStepsCount() {
    const set = doneSet(state.recipeId);
    const r = recipeContent(byId(state.recipeId) || FEATURED);
    const el = $("#steps-count"); if (el) el.textContent = `${set.size}/${r.steps.length} done`;
  }
  function segSwitch() {
    $$(".m-seg button").forEach((b) => b.classList.toggle("active", b.getAttribute("data-seg") === state.seg));
    const body = $("#m-seg-body"); const r = recipeContent(byId(state.recipeId) || FEATURED);
    if (body) body.innerHTML = state.seg === "ingredients" ? mIngredientsHTML(r) : mMethodHTML(r);
  }
  function loaderTab(which) {
    const body = $("#loader-body"); if (!body) return;
    $$("[data-loadertab]").forEach((b) => b.classList.toggle("active", b.getAttribute("data-loadertab") === which));
    if (which === "upload") {
      body.innerHTML = `<div style="padding:8px"><div style="position:relative;border-radius:14px;overflow:hidden;aspect-ratio:16/9;background:var(--bg);border:1.5px dashed rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;color:var(--muted-2)">${IC.upload}<div style="font-weight:600">Drag a video here, or click to browse</div><div style="font-size:13px">MP4, MOV, WEBM · up to 200 MB</div></div></div>`;
    } else {
      body.innerHTML = ""; render();
    }
  }

  /* ---- video actions ---- */
  function seekTo(start) {
    if (!state.video) { toast("Load the video first to jump to a step"); return; }
    const iframe = $("#rc-iframe") || $("#cook-iframe") || $("#video-zone iframe") || $(".m-rhero iframe") || $(".m-cook-video iframe");
    if (iframe) iframe.src = embedSrc(state.video.base, state.video.type, start);
  }
  function loadRecipeVideo(raw) {
    const info = parseVideo(raw);
    const err = $("#rc-err");
    if (info.error) { if (err) err.innerHTML = `<div class="url-err">${h(info.error)}</div>`; return; }
    state.video = { base: info.base, type: info.type, platform: info.platform };
    state.showPaste = false;
    $("#video-zone").innerHTML = videoZoneHTML(recipeContent(byId(state.recipeId) || FEATURED));
    $$(".step .tc").forEach((c) => c.classList.add("live"));
    wire();
  }
  function nextStep() {
    const r = recipeContent(byId(state.recipeId) || FEATURED);
    const set = doneSet(state.recipeId);
    set.add(state.activeStep);
    if (state.activeStep >= r.steps.length - 1) { toast("Nice — you finished the cook! 🎉"); state.cook = false; render(); return; }
    state.activeStep += 1;
    render();
  }

  /* ===================================================================
     CAPTCHA — self-hosted Altcha proof-of-work (open source, no tracking).
     The browser burns a little CPU solving a signed SHA-256 challenge; the
     token gates POST /recipes so bots can't hammer the public extractor.
     =================================================================== */
  async function refreshCaptcha() {
    try {
      const res = await fetch(API_BASE + "/api/v1/meta", { cache: "no-store" });
      if (!res.ok) return;
      const meta = await res.json();
      const on = !!meta.captcha_enabled;
      if (on !== state.captcha.enabled) {
        state.captcha.enabled = on;
        if (on && (state.view === "home" || state.view === "add")) render();
      }
      if (meta.ingest) {
        const changed = JSON.stringify(meta.ingest) !== JSON.stringify(state.ingest);
        state.ingest = meta.ingest;
        if (changed && (state.view === "home" || state.view === "add" || state.view === "recipe")) render();
      }
    } catch (e) { /* backend not up yet — widget just stays hidden */ }
  }
  function toHex(buf) {
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  async function powSolve(c) {
    const enc = new TextEncoder();
    const max = c.maxnumber || 100000;
    for (let n = 0; n <= max; n++) {
      const hex = toHex(await crypto.subtle.digest("SHA-256", enc.encode(c.salt + n)));
      if (hex === c.challenge) {
        return btoa(JSON.stringify({
          algorithm: c.algorithm, challenge: c.challenge, number: n, salt: c.salt, signature: c.signature,
        }));
      }
    }
    throw new Error("could not solve challenge");
  }
  /* Return a fresh, valid captcha token (solving if needed). null when disabled. */
  async function ensureCaptcha(force) {
    if (!state.captcha.enabled) return null;
    const fresh = state.captcha.token && Date.now() - state.captcha.at < 4 * 60 * 1000;
    if (fresh && !force) return state.captcha.token;
    state.captcha.solving = true; updateCaptchaWidget();
    try {
      const res = await fetch(API_BASE + "/api/v1/captcha", { cache: "no-store" });
      const c = await res.json();
      if (!c || !c.enabled) { state.captcha.enabled = false; return null; }
      const token = await powSolve(c);
      state.captcha.token = token; state.captcha.at = Date.now();
      return token;
    } finally { state.captcha.solving = false; updateCaptchaWidget(); }
  }
  function captchaWidgetHTML() {
    if (!state.captcha.enabled) return "";
    const verified = !!state.captcha.token && Date.now() - state.captcha.at < 4 * 60 * 1000;
    const st = state.captcha.solving ? "solving" : verified ? "verified" : "idle";
    const mark = st === "solving" ? '<span class="mini-spin"></span>' : st === "verified" ? "✓" : "";
    const label = st === "solving" ? "Checking…" : st === "verified" ? "You're human ✓" : "Verify you're human";
    return `
      <div class="captcha" id="captcha-widget" data-state="${st}">
        <button class="cap-box" id="cap-check" type="button" ${verified ? "disabled" : ""}>${mark}</button>
        <div class="cap-txt"><span class="cap-label">${label}</span><span class="cap-sub">Open-source proof-of-work · no tracking</span></div>
        <span class="cap-badge">🔒 Altcha</span>
      </div>`;
  }
  function updateCaptchaWidget() {
    const w = $("#captcha-widget"); if (!w) return;
    w.outerHTML = captchaWidgetHTML();
    const btn = $("#cap-check"); if (btn) btn.onclick = () => ensureCaptcha(true);
  }

  /* ---- live extraction: paste a link → real, structured recipe ---- */
  function startExtraction(raw, errSel) {
    const info = parseVideo(raw);
    if (info.error) {
      const err = $(errSel || "#add-err") || $("#rc-err");
      if (err) err.innerHTML = `<div class="url-err" style="margin-top:12px">${h(info.error)}</div>`;
      else toast(info.error);
      return;
    }
    if (info.type === "youtube" && ytIngestOff()) {
      const err = $(errSel || "#add-err") || $("#rc-err");
      const msg = "YouTube link extraction is temporarily unavailable. Please upload the video file instead.";
      if (err) err.innerHTML = `<div class="url-err" style="margin-top:12px">${h(msg)}</div>`;
      else toast(msg);
      return;
    }
    state.extractJob = { raw: raw.trim(), info, pct: 4, stageKey: "queued", phase: "running", error: null, jobId: null };
    navigate("#/extract");
    runExtraction();
  }
  async function runExtraction() {
    const j = state.extractJob; if (!j) return;
    let up = false;
    try {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 2000);
      const res = await fetch(API_BASE + "/health", { signal: ctrl.signal });
      clearTimeout(to); up = res.ok;
    } catch (e) { up = false; }
    if (state.extractJob !== j) return;                 // user navigated away / restarted
    if (!up) {
      extractError("The RecipeReel backend isn't reachable at " + API_BASE +
        ". Start it (make serve, or docker compose up) and try again.");
      return;
    }
    // CAPTCHA: solve the proof-of-work before submitting (no-op when disabled).
    let token = null;
    if (state.captcha.enabled) {
      j.verifying = true; const sub = $("#ex-sub");
      if (sub) sub.textContent = "Verifying you're human (open-source proof-of-work)…";
      try { token = await ensureCaptcha(); } catch (e) { extractError("Couldn't complete the human-verification step."); return; }
      j.verifying = false;
      if (state.extractJob !== j) return;
    }
    let job;
    try {
      job = await postExtraction(j.raw, token);
    } catch (e) {
      if (e.status === 403 && state.captcha.enabled) {
        // token expired / replayed — solve a fresh one and retry once
        try { token = await ensureCaptcha(true); job = await postExtraction(j.raw, token); }
        catch (e2) { extractError("Human-verification failed. Please try again."); return; }
      } else { extractError("Couldn't start the extraction job (" + e.message + ")."); return; }
    }
    if (state.extractJob !== j) return;
    j.jobId = job.id;
    streamExtraction(job.id, j);
  }
  async function postExtraction(raw, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["X-Altcha-Solution"] = token;
    const res = await fetch(API_BASE + "/api/v1/recipes", {
      method: "POST", headers, body: JSON.stringify({ url: raw }),
    });
    if (!res.ok) { const err = new Error("HTTP " + res.status); err.status = res.status; throw err; }
    return res.json();
  }
  function updateExtract(d) {
    const j = state.extractJob; if (!j || j.phase === "error") return;
    if (typeof d.percent === "number") j.pct = d.percent;
    if (d.stage) j.stageKey = d.stage;
    const fill = $("#ex-fill"); if (fill) fill.style.width = (j.pct || 0) + "%";
    const pct = $("#ex-pct"); if (pct) pct.textContent = Math.round(j.pct || 0) + "%";
    const stages = $("#ex-stages"); if (stages) stages.innerHTML = exStagesHTML(j.stageKey);
  }
  function streamExtraction(jobId, j) {
    let es, settled = false;
    try { es = new EventSource(API_BASE + "/api/v1/jobs/" + jobId + "/events"); }
    catch (e) { pollExtraction(jobId, 0); return; }
    es.addEventListener("progress", (ev) => {
      let d; try { d = JSON.parse(ev.data); } catch (_) { return; }
      if (state.extractJob !== j) { es.close(); return; }
      updateExtract(d);
      if (d.status === "succeeded" || d.stage === "done") { settled = true; es.close(); finishExtraction(d.recipe_id, jobId); }
      else if (d.status === "failed" || d.stage === "failed") { settled = true; es.close(); extractError(d.error || "The video couldn't be processed."); }
    });
    es.onerror = () => { if (settled) return; es.close(); pollExtraction(jobId, 0); };
  }
  async function pollExtraction(jobId, tries) {
    if (!state.extractJob) return;
    try {
      const res = await fetch(API_BASE + "/api/v1/jobs/" + jobId);
      if (res.ok) {
        const jd = await res.json();
        updateExtract({ percent: jd.progress && jd.progress.percent, stage: jd.progress && jd.progress.stage, status: jd.status });
        if (jd.status === "succeeded") { finishExtraction(jd.recipe_id, jobId); return; }
        if (jd.status === "failed") { extractError(jd.error || "The video couldn't be processed."); return; }
      }
    } catch (e) { /* transient — keep polling */ }
    if (tries > 120) { extractError("Timed out waiting for the extraction to finish."); return; }
    setTimeout(() => pollExtraction(jobId, tries + 1), 1000);
  }
  async function finishExtraction(recipeId, jobId) {
    const j = state.extractJob; if (!j) return;
    if (!recipeId) {
      try { const r = await fetch(API_BASE + "/api/v1/jobs/" + jobId); recipeId = (await r.json()).recipe_id; } catch (e) { /* fall through */ }
    }
    if (!recipeId) { extractError("Extraction finished but no recipe was returned."); return; }
    try {
      const res = await fetch(API_BASE + "/api/v1/recipes/" + recipeId);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const api = await res.json();
      const mapped = mapApiRecipe(api, j.info);
      EXTRACTED[mapped.id] = mapped;
      state.recipeId = mapped.id;
      state.video = j.info ? { base: j.info.base, type: j.info.type, platform: j.info.platform } : null;
      state.showPaste = false; state.seg = "ingredients"; state.cook = false; state.activeStep = 0;
      state.extractJob = null;
      toast("Recipe extracted ✓");
      navigate("#/recipe/" + mapped.id);
    } catch (e) { extractError("Couldn't load the extracted recipe (" + e.message + ")."); }
  }
  function extractError(msg) {
    if (!state.extractJob) return;
    state.extractJob.phase = "error";
    state.extractJob.error = msg;
    if (state.view === "extract") render(); else toast(msg);
  }

  /* ---- misc ---- */
  let toastTimer;
  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }
  let io;
  function observeReveals() {
    const nodes = $$("[data-reveal]");
    if (!("IntersectionObserver" in window)) { nodes.forEach((n) => n.classList.add("in")); return; }
    if (io) io.disconnect();
    io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    nodes.forEach((n) => io.observe(n));
    setTimeout(() => nodes.forEach((n) => n.classList.add("in")), 2500);
  }

  /* ---- boot ---- */
  let wasMobile = isMobile();
  mq.addEventListener ? mq.addEventListener("change", () => { wasMobile = isMobile(); render(); })
    : window.addEventListener("resize", () => { if (isMobile() !== wasMobile) { wasMobile = isMobile(); render(); } });
  window.addEventListener("hashchange", render);
  document.addEventListener("DOMContentLoaded", render);
  if (document.readyState !== "loading") render();
  refreshCaptcha();   // discover whether the backend requires a CAPTCHA
})();
