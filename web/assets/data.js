/* ===================================================================
   JustCook / RecipeReel — seed data
   All images verified reachable (Unsplash CDN) or are real YouTube
   thumbnails. All 8 videos supplied by the team are wired in.
   =================================================================== */

const IMG = (id, w = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`;
const YT_THUMB = (id) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
const YT_THUMB_FALLBACK = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/* Accurate brand marks (inline SVG). Kept crisp + on-brand. */
const LOGOS = {
  youtube: `<svg viewBox="0 0 24 24" aria-label="YouTube"><rect x="1" y="4" width="22" height="16" rx="5" fill="#FF0000"/><path d="M10 8.2l6 3.8-6 3.8z" fill="#fff"/></svg>`,
  vimeo: `<svg viewBox="0 0 24 24" aria-label="Vimeo"><rect x="2" y="2" width="20" height="20" rx="6" fill="#17b3e8"/><path d="M18.2 8.6c-.08 1.76-1.31 4.17-3.69 7.23-2.46 3.2-4.54 4.8-6.24 4.8-1.05 0-1.94-.97-2.67-2.92l-1.46-5.34c-.54-1.95-1.12-2.92-1.74-2.92-.14 0-.6.28-1.4.83l-.84-1.08c.88-.77 1.74-1.55 2.59-2.32 1.17-1.01 2.04-1.54 2.62-1.6 1.38-.13 2.23.81 2.55 2.83.35 2.18.59 3.53.72 4.06.4 1.82.85 2.72 1.33 2.72.38 0 .94-.6 1.7-1.79.75-1.19 1.15-2.1 1.21-2.72.11-1.05-.31-1.58-1.21-1.58-.43 0-.87.1-1.32.29.88-2.88 2.56-4.28 5.05-4.2 1.84.06 2.71 1.26 2.6 3.6z" fill="#fff"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" aria-label="Instagram"><defs><linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FEDA75"/><stop offset=".45" stop-color="#FA7E1E"/><stop offset=".7" stop-color="#D62976"/><stop offset="1" stop-color="#962FBF"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad)"/><rect x="6.3" y="6.3" width="11.4" height="11.4" rx="3.6" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="12" cy="12" r="2.8" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="16.4" cy="7.6" r="1.05" fill="#fff"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" aria-label="Facebook"><rect x="2" y="2" width="20" height="20" rx="6" fill="#1877F2"/><path d="M14.6 12.3h-1.9V19h-2.6v-6.7H8.8V10h1.3V8.7c0-1.9 1-2.9 2.9-2.9h1.7v2.2h-1.1c-.6 0-.9.3-.9.9V10h2.1l-.2 2.3z" fill="#fff"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" aria-label="TikTok"><rect x="2" y="2" width="20" height="20" rx="6" fill="#010101"/><path d="M16.9 8.9c-1.14-.06-2.16-.62-2.83-1.5v5.72a3.98 3.98 0 1 1-3.98-3.98c.2 0 .4.02.6.05v2.05a1.94 1.94 0 0 0-.6-.1 1.98 1.98 0 1 0 1.98 1.98V5.2h1.98a2.83 2.83 0 0 0 2.87 2.75z" fill="#25F4EE"/><path d="M17.3 8.6c-1.14-.06-2.16-.62-2.83-1.5v5.72a3.98 3.98 0 1 1-3.98-3.98c.2 0 .4.02.6.05v2.05a1.94 1.94 0 0 0-.6-.1 1.98 1.98 0 1 0 1.98 1.98V4.9h1.98a2.83 2.83 0 0 0 2.87 2.75z" fill="#fff"/></svg>`,
  amd: `<svg viewBox="0 0 90 24" aria-label="AMD"><path fill="#ED1C24" d="M18 3l3 3h-9L9 9V3h9zM3 21V6h3l6 6v9H9v-6l-3-3v9H3zm18 0V9l3-3v12l-3 3z"/></svg>`,
};

/* ---------- The featured recipe: Classic Pepperoni Pizza ---------- */
const FEATURED = {
  id: "classic-pepperoni-pizza",
  name: "Classic Pepperoni Pizza",
  titleAccent: "Pepperoni",
  cuisine: "Italian",
  category: "Main course",
  difficulty: "Easy",
  episode: "Episode 24",
  channel: "Joshua Weissman",
  rating: "4.9",
  cooks: "2,140",
  time: "35 min",
  serves: "4",
  duration: "12:45",
  video: "429Tq8j73Hg", // Joshua Weissman — The Best Pepperoni Pizza At Home
  poster: IMG("1513104890138-7c749659a591", 1000),
  description:
    "Blistered crust, molten mozzarella and crisp, curled pepperoni — the whole build in one short video, with every ingredient and timed step laid out below.",
  prep: "20", cook: "15", total: "35",
  ingredientGroups: [
    { title: "Dough", color: "#f24e1e", bg: "#fff1ec", items: [
      { amt: "500g", name: "Bread flour", emoji: "🌾", src: "on_screen" },
      { amt: "7g", name: "Instant yeast", emoji: "🫧", src: "on_screen" },
      { amt: "325ml", name: "Warm water", emoji: "💧", src: "on_screen" },
      { amt: "10g", name: "Fine salt", emoji: "🧂", src: "on_screen" },
      { amt: "2 tbsp", name: "Olive oil", emoji: "🫒", src: "spoken" },
      { amt: "1 tsp", name: "Sugar", emoji: "🍬", src: "spoken" },
    ]},
    { title: "Sauce", color: "#09a866", bg: "#e9f9f1", items: [
      { amt: "400g", name: "Crushed tomatoes", emoji: "🍅", src: "on_screen" },
      { amt: "1 clove", name: "Garlic, grated", emoji: "🧄", src: "spoken" },
      { amt: "1 tsp", name: "Dried oregano", emoji: "🌿", src: "spoken" },
      { amt: "pinch", name: "Salt + olive oil", emoji: "🧂", src: "inferred" },
    ]},
    { title: "Toppings", color: "#a259ff", bg: "#f4edff", items: [
      { amt: "250g", name: "Low-moisture mozzarella", emoji: "🧀", src: "on_screen" },
      { amt: "100g", name: "Pepperoni slices", emoji: "🍕", src: "on_screen" },
      { amt: "handful", name: "Fresh basil", emoji: "🌿", src: "spoken" },
      { amt: "to taste", name: "Chilli flakes", emoji: "🌶️", src: "spoken" },
    ]},
  ],
  steps: [
    { t: "Make the dough", time: "90 min rise", c: "#f24e1e", tc: "0:00", start: 0,
      photo: IMG("1509440159596-0249088772ff", 400),
      d: "Combine flour, yeast, sugar and salt. Add the water and oil, then knead 8–10 minutes until smooth and elastic. Cover and let it rise until doubled." },
    { t: "Quick tomato sauce", time: "5 min", c: "#e08422", tc: "2:30", start: 150,
      photo: IMG("1592417817098-8fd3d9eb14a5", 400),
      d: "Blend the crushed tomatoes with grated garlic, oregano, a pinch of salt and a drizzle of olive oil. No cooking needed." },
    { t: "Preheat hard", time: "30 min", c: "#09a866", tc: "4:10", start: 250,
      photo: IMG("1590534247854-e97d5e3feef6", 400),
      d: "Put a pizza stone or steel on the top rack and heat the oven to its maximum (250–290°C / 480–550°F) for at least 30 minutes." },
    { t: "Shape & top", time: "5 min", c: "#0d99ff", tc: "5:45", start: 345,
      photo: IMG("1594007654729-407eedc4be65", 400),
      d: "Stretch each dough ball to about 10 inches. Spread a thin layer of sauce, scatter the mozzarella, then lay the pepperoni on top." },
    { t: "Bake & finish", time: "12–15 min", c: "#a259ff", tc: "8:20", start: 500,
      photo: IMG("1513104890138-7c749659a591", 400),
      d: "Slide onto the hot stone and bake 12–15 minutes until the crust is blistered and the pepperoni curls. Finish with fresh basil and chilli." },
  ],
  equipment: [
    "🪨 Pizza stone or steel", "🥣 Large mixing bowl", "🥖 Rolling pin",
    "🍕 Pizza peel", "🥄 Ladle", "🔥 Oven (250°C+)",
  ],
};

/* ---------- The recipe library ---------- */
/* video: YouTube id (real, supplied) or null. poster: image URL. */
const RECIPES = [
  { id: FEATURED.id, name: "Classic Pepperoni Pizza", cuisine: "Italian", difficulty: "Easy", time: "35 min", serves: "4", rating: "4.9", duration: "12:45", rank: 1, popular: true, video: "429Tq8j73Hg", poster: FEATURED.poster },
  { id: "diner-smash-burgers", name: "Diner-Style Smash Burgers", cuisine: "American", difficulty: "Easy", time: "18 min", serves: "2", rating: "4.8", duration: "08:20", rank: 2, popular: true, video: "kfW94tNMFkA", poster: IMG("1571091718767-18b5b1457add") },
  { id: "fresh-egg-pasta", name: "Fresh Egg Pasta Dough", cuisine: "Italian", difficulty: "Medium", time: "45 min", serves: "4", rating: "4.7", duration: "15:04", rank: 3, popular: true, video: "UfvrcHzv4TQ", poster: IMG("1621996346565-e3dbc646d9a9") },
  { id: "molten-lava-cake", name: "Molten Chocolate Lava Cake", cuisine: "Dessert", difficulty: "Medium", time: "25 min", serves: "4", rating: "4.9", duration: "11:37", rank: 4, popular: true, video: "s5fQEm4jS3c", poster: IMG("1624353365286-3f8d62daad51") },
  { id: "thai-green-curry", name: "Thai Green Curry", cuisine: "Thai", difficulty: "Medium", time: "40 min", serves: "4", rating: "4.8", duration: "16:20", video: "nkFGon5mRrM", poster: YT_THUMB("nkFGon5mRrM"), posterFallback: YT_THUMB_FALLBACK("nkFGon5mRrM") },
  { id: "thai-curry-meatballs", name: "Thai Green Curry Meatballs", cuisine: "Thai", difficulty: "Easy", time: "30 min", serves: "3", rating: "4.7", duration: "09:48", video: "Xhxges766Jg", poster: IMG("1455619452474-d2be8b1e70cd") },
  { id: "semolina-pasta", name: "Semolina Pasta, No Eggs", cuisine: "Italian", difficulty: "Easy", time: "35 min", serves: "3", rating: "4.6", duration: "07:12", video: "LkGIwkxmi3A", poster: IMG("1551183053-bf91a1d81141") },
  { id: "quick-lava-cake", name: "10-Minute Lava Cake", cuisine: "Dessert", difficulty: "Easy", time: "12 min", serves: "2", rating: "4.7", duration: "05:30", video: "Gf9n5oze-1Y", poster: IMG("1578985545062-69928b1d9587") },
  { id: "butter-croissants", name: "Butter Croissants", cuisine: "French", difficulty: "Hard", time: "3 hr", serves: "8", rating: "4.6", duration: "22:10", video: null, poster: IMG("1555507036-ab1f4038808a") },
  { id: "chicken-tikka-masala", name: "Chicken Tikka Masala", cuisine: "Indian", difficulty: "Medium", time: "50 min", serves: "4", rating: "4.8", duration: "16:32", video: null, poster: IMG("1565557623262-b51c2513a641") },
  { id: "fluffy-pancakes", name: "Fluffy Pancakes", cuisine: "Breakfast", difficulty: "Easy", time: "20 min", serves: "3", rating: "4.7", duration: "06:48", video: null, poster: IMG("1567620905732-2d1ec7ab7445") },
  { id: "pork-ramen", name: "Pork Ramen", cuisine: "Japanese", difficulty: "Hard", time: "4 hr", serves: "4", rating: "4.9", duration: "28:15", video: null, poster: IMG("1569718212165-3a8278d5f624") },
  { id: "caesar-salad", name: "Caesar Salad", cuisine: "American", difficulty: "Easy", time: "15 min", serves: "2", rating: "4.5", duration: "05:22", video: null, poster: IMG("1550304943-4f24f54ddde9") },
  { id: "beef-wellington", name: "Beef Wellington", cuisine: "British", difficulty: "Hard", time: "2.5 hr", serves: "6", rating: "4.8", duration: "31:40", video: null, poster: IMG("1600891964092-4316c288032e") },
  { id: "street-tacos", name: "Street-Style Tacos", cuisine: "Mexican", difficulty: "Easy", time: "30 min", serves: "4", rating: "4.8", duration: "10:05", video: null, poster: IMG("1565299624946-b28f40a0ae38") },
  { id: "sourdough-loaf", name: "Sourdough Loaf", cuisine: "Baking", difficulty: "Hard", time: "24 hr", serves: "1 loaf", rating: "4.7", duration: "19:53", video: null, poster: IMG("1589367920969-ab8e050bbb04") },
  { id: "pad-thai", name: "Pad Thai", cuisine: "Thai", difficulty: "Medium", time: "35 min", serves: "3", rating: "4.7", duration: "13:18", video: null, poster: IMG("1617093727343-374698b1b08d") },
  { id: "creamy-risotto", name: "Creamy Risotto", cuisine: "Italian", difficulty: "Medium", time: "40 min", serves: "4", rating: "4.6", duration: "17:44", video: null, poster: IMG("1476124369491-e7addf5db371") },
  { id: "guacamole", name: "Guacamole", cuisine: "Mexican", difficulty: "Easy", time: "10 min", serves: "4", rating: "4.6", duration: "04:11", video: null, poster: IMG("1601000938259-9e92002320b2") },
  { id: "macarons", name: "French Macarons", cuisine: "French", difficulty: "Hard", time: "2 hr", serves: "24", rating: "4.5", duration: "25:30", video: null, poster: IMG("1558326567-98ae2405596b") },
  { id: "shakshuka", name: "Shakshuka", cuisine: "Middle Eastern", difficulty: "Easy", time: "25 min", serves: "2", rating: "4.7", duration: "09:37", video: null, poster: IMG("1590412200988-a436970781fa") },
  { id: "gyoza", name: "Gyoza Dumplings", cuisine: "Japanese", difficulty: "Medium", time: "55 min", serves: "4", rating: "4.8", duration: "18:26", video: null, poster: IMG("1541696490-8744a5dc0228") },
];

/* mobile "browse" categories + cuisines */
const CATEGORIES = [
  { t: "Pizza & Pasta", s: "128 recipes", emoji: "🍕", grad: "linear-gradient(135deg,#ff8a5c,#f24e1e)", q: "Italian" },
  { t: "Baking", s: "94 recipes", emoji: "🥐", grad: "linear-gradient(135deg,#8f6bff,#a259ff)", q: "Baking" },
  { t: "Healthy", s: "210 recipes", emoji: "🥗", grad: "linear-gradient(135deg,#2ecf8a,#09a866)", q: "Salad" },
  { t: "Quick", s: "15 min or less", emoji: "⚡", grad: "linear-gradient(135deg,#3fb0ff,#0d99ff)", q: "easy" },
];
const CUISINES = ["🇮🇹 Italian", "🇲🇽 Mexican", "🇯🇵 Japanese", "🇮🇳 Indian", "🇹🇭 Thai", "🇫🇷 French"];

window.JC = { IMG, YT_THUMB, YT_THUMB_FALLBACK, LOGOS, FEATURED, RECIPES, CATEGORIES, CUISINES };
