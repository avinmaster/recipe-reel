# Test / demo videos

The sandbox where Claude built this can't download YouTube (server-IP bot-block), but **your
machine and the AMD pod can** — just paste a URL into the running app:

```bash
curl -s -X POST localhost:8000/api/v1/recipes -H 'content-type: application/json' \
     -d '{"url":"https://www.youtube.com/shorts/KHc4RKK9zj8"}'
```

## What makes a great RecipeReel demo video
The product's superpower is **fusing spoken steps with on-screen text** (where the quantities
live). So the best clips have **both**:
- a **spoken walkthrough** (narration of the steps) → shows off the Whisper stage, and
- an **on-screen ingredient list / quantities** → shows off the vision + on-screen-text stage.
- **60 sec – 3 min**, one clear recipe. (Shorts work and are fast; a 1–3 min full recipe with a
  visible ingredient card is the most impressive showcase.)

## Candidate links (recipe shorts with on-screen text, found Jul 11)
- The EASIEST dessert in 20 minutes — https://www.youtube.com/shorts/KHc4RKK9zj8
- EASY AND QUICK MILK TOAST RECIPE (on-screen "spread condensed milk…") — https://www.youtube.com/shorts/rfYtSoCfmb4
- Just 4 Ingredients Caramel Pudding — https://www.youtube.com/shorts/RwfwO5IXEEw
- Throw a bunch of ingredients into a pot (savory dinner) — https://www.youtube.com/shorts/hKdWeq4LXFw
- No Bake, 2 Ingredients — https://www.youtube.com/shorts/F8WTqqLZqaA
- 3-Ingredient Chocolate Fudge — search "3 Ingredient Chocolate Fudge short"

Pick one you like (ideally a savory dish with several ingredients + amounts on screen — it makes
the structured output look richest), and record the demo against it.

> Tip: for the record-worthy run, use the AMD pod (`TRANSCRIBER=local VISION=local`) so the demo
> genuinely shows Whisper + Qwen2.5-VL on the MI300X.
