---
doc: spec
status: approved
---

# DesiTadka — Technical Spec

## How This Works, In Plain Language
DesiTadka is one **Next.js app** running on your laptop. You open it in your phone's browser over the same Wi-Fi, and it looks and feels like a phone app.

When you paste an Instagram reel link:
1. The app checks that it looks like a real Instagram reel link.
2. On your laptop, **yt-dlp** (a command-line downloader) grabs the reel video and its caption. **ffmpeg** pulls a few still frames out of the video.
3. The frames and caption go to **OpenAI**, which reads them and writes back a structured recipe or workout card as JSON.
4. When you tap a swap icon, OpenAI suggests Indian alternatives. When you apply a swap, it rewrites the card, including protein and calories for recipes.
5. When you tap **Save**, the card is written to a file on your laptop (`data/cards.json`), so your phone and laptop both see the same saved list.

OpenAI can be reached in **two ways**, chosen by a setting:
- **API key mode:** the app calls the OpenAI API with your key. Swaps also get an AI-generated picture.
- **Local Codex mode:** the app runs the Codex CLI already installed on your machine (you give it the path). No API key is needed, but there's no image generation, so swapped cards keep the reel frame with a "swapped" badge.

Why this shape: everything runs in one process on one machine. Instagram tends to block cloud servers, so running yt-dlp from your home connection is the most reliable way to get reels. There's no database, no login, and no deployment.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. **Open Home** → the page asks the server for saved cards → the server reads `data/cards.json` → you see your list, or the empty state.
2. **Paste a link** → the browser checks the link format right away. If it isn't an Instagram reel/post URL, you see "Wrong link" and nothing is sent.
3. **Submit** → `POST /api/extract` → the server runs yt-dlp. If that fails, you see "Unable to access, please check" and a box to paste the caption instead.
4. → the server runs ffmpeg to save 4–6 frames into `public/media/<id>/`.
5. → the server sends the frames and caption to the **AI provider** (OpenAI API or Codex CLI) and asks for a card in the agreed JSON shape. The AI also labels the reel as `recipe`, `workout`, or `other`.
6. → the browser shows the **Convert view** with the original card. An `other` reel shows "This doesn't look like a recipe or workout."
7. **Tap ↺ on an item** → `POST /api/suggest` → you get Indian-ingredient (or alternative exercise) suggestions → pick one or type your own.
8. **Apply** → `POST /api/apply` → the AI returns the updated card. Recipes get new protein and calories. Swapped items are marked so the UI highlights them. In API key mode, `POST /api/image` generates a new picture of the swapped dish.
9. **Save** → `POST /api/cards` → appended to `data/cards.json` → back on Home, the card is in the list.
10. **Tap a saved card** → Card Detail reads that card → you cook or work out without rewatching.

## Stack
- **Next.js (App Router) + TypeScript.** You already know Next.js and React. One app holds both the screens and the server routes. Docs: https://nextjs.org/docs
- **Tailwind CSS** for mobile-first styling. Docs: https://tailwindcss.com/docs
- **zod** to validate the AI's JSON against the card shape before using it. Docs: https://zod.dev
- **openai** (official Node SDK) for API key mode. Docs: https://platform.openai.com/docs
- **Codex CLI** for local Codex mode, run from the server with Node's `child_process`. Docs: https://github.com/openai/codex
- **yt-dlp** for downloading reels and captions. Docs: https://github.com/yt-dlp/yt-dlp
- **ffmpeg** for extracting frames. Docs: https://ffmpeg.org/documentation.html
- Node.js 20+.

**Unverified — check early in the build:**
- Current OpenAI model names for vision + JSON output, and for image generation. These are config values (`OPENAI_MODEL`, `OPENAI_IMAGE_MODEL`), not hardcoded.
- The exact `codex exec` flags for attaching images, forcing a JSON output shape, and running non-interactively. Run `codex exec --help` on your machine first.
- Whether yt-dlp can currently fetch public Instagram reels without logging in.

## Where It Runs and How Someone Tries It
- **Runtime:** local Node server on your laptop; the browser on your phone or laptop.
- **Requirements:** Node 20+, `yt-dlp` and `ffmpeg` on your PATH (e.g. `brew install yt-dlp ffmpeg`), plus either an OpenAI API key or the Codex CLI installed and logged in.
- **Configuration (`.env.local`, never committed; `.env.example` documents it):**
  - `AI_MODE=codex` or `AI_MODE=api`
  - `CODEX_PATH=/path/to/codex` (Codex mode)
  - `OPENAI_API_KEY=...`, `OPENAI_MODEL=...`, `OPENAI_IMAGE_MODEL=...` (API mode)
- **Start:** `npm install`, then `npm run dev -- -H 0.0.0.0`.
  - On the laptop, open `http://localhost:3000`.
  - On the phone (same Wi-Fi), open `http://<laptop-ip>:3000`.
- **Demo recording:** record on the phone, or use the browser's phone-size view on the laptop. Show pasting a Western recipe reel, the original card, swapping an ingredient (highlight plus new protein/calories), Save, and the card on Home.
- **Submission:** short demo video + public GitHub repo. Deployment is not planned (Instagram blocks cloud servers); it's optional and can be revisited in `6-ship`.

## Look and Feel
From `prd.md > Look and Feel`: **warm and spicy**, a visual card rather than chat text.
- **Palette:** chili red (`#D9480F`) as the main accent, turmeric (`#F08C00`) for swap icons and highlights, a warm cream background (`#FDF6EE`), deep brown text (`#2A1A10`), leaf green (`#2B8A3E`) for Save and success. Swapped items use a soft turmeric highlight with a ↺ marker.
- **Typography:** a rounded, characterful display font for headings and the logo (Baloo 2, via `next/font/google`), and a clean sans-serif for body text (Inter).
- **Layout:** mobile-first, a single column, cards with generous rounding and a soft shadow, large tap targets, and the reel frame as a hero image at the top of each card.
- **Tone:** friendly and a little playful ("Add some tadka" on the convert prompt), with plain error messages.
- **References:** Gamma and Napkin for the polished "visual output" feel; Strava and Cult.fit for the fitness-app energy.

## Components

### Home Page
`app/page.tsx`. Link box at the top with instant format validation, and the saved cards list below it (dish or workout name, type tag, thumbnail frame). Shows the empty state when there are no cards.
PRD ref: `prd.md > Save and Home List`, `prd.md > Paste a Reel`, `prd.md > States and Boundaries`.

### Convert View
`app/convert/page.tsx`. Shows the card for the reel just extracted, the "convert?" prompt, swap icons, "Make it vegetarian" (recipes), the swap counter (workouts), and Save. Holds the in-progress card in React state; leaving without Save discards it.
PRD ref: `prd.md > Recipe Swaps (the star)`, `prd.md > Workout Swaps`.

### Card Detail Page
`app/cards/[id]/page.tsx`. Read-only view of a saved card with swaps applied.
PRD ref: `prd.md > Save and Home List`.

### Recipe Card and Workout Card
`components/RecipeCard.tsx`, `components/WorkoutCard.tsx`. Shared display for Convert and Detail.
- **Recipe:** name, picture, prep time, protein, calories, ingredients, number of steps, and steps.
- **Workout:** name, frequency, rounds, and exercises with reps and an image.

Each item shows a swap icon in edit mode and a highlight when swapped.
PRD ref: `prd.md > Recipe Card`, `prd.md > Workout Card`.

### Swap Sheet
`components/SwapSheet.tsx`. Bottom sheet that opens from a swap icon. Shows the AI suggestions plus a "type your own" input.
PRD ref: `prd.md > Recipe Swaps (the star)`.

### Link Validation
`lib/validateLink.ts`. Client-side check that the URL is an `instagram.com/reel/...` or `instagram.com/p/...` link; also re-checked on the server.
PRD ref: `prd.md > Paste a Reel`.

### Reel Extractor
`lib/reel.ts`. Runs yt-dlp to download the video and its metadata (caption) into `tmp/`, then ffmpeg to save 4–6 evenly spaced frames to `public/media/<id>/`. Returns `{ caption, framePaths }`. Throws a typed "inaccessible" error if yt-dlp fails.
PRD ref: `prd.md > Paste a Reel`.

### AI Provider
`lib/ai/index.ts` picks the provider from `AI_MODE`. Both providers implement the same functions:
- `extractCard(frames, caption)` → `{ kind: "recipe" | "workout" | "other", card }`
- `suggestSwaps(card, itemName)` → `string[]` (2–4 Indian-ingredient or alternative-exercise suggestions)
- `applySwaps(card, swaps)` → updated card. Recipes get new nutrition; swapped items are marked.
- `makeVegetarian(card)` → updated card with every non-vegetarian ingredient swapped and marked.
- `generateImage(card)` → image path, or `null` if not supported.

Prompts live in `lib/ai/prompts.ts` and tell the model the audience is people in India, to prefer ingredients commonly available in Indian kitchens and markets, and to estimate protein and calories per serving.

#### OpenAI API Provider
`lib/ai/openaiApi.ts`. Uses the `openai` SDK with image inputs and JSON-shaped output. `generateImage` calls the image API and saves the result to `public/media/<id>/swapped-<n>.png`.

#### Codex CLI Provider
`lib/ai/codexCli.ts`. Runs `CODEX_PATH exec` non-interactively with the frame images attached and the prompt asking for JSON matching the schema, then reads the final message. `generateImage` returns `null`, and the UI shows the reel frame with a **"swapped"** badge.

### API Routes
- `app/api/extract/route.ts`: validate → Reel Extractor → `extractCard`. Accepts `{ url }` or `{ caption }` (the fallback).
- `app/api/suggest/route.ts`: `suggestSwaps`.
- `app/api/apply/route.ts`: `applySwaps` / `makeVegetarian`, then `generateImage` (API mode).
- `app/api/cards/route.ts`: `GET` lists saved cards; `POST` saves one.
- `app/api/cards/[id]/route.ts`: `GET` one card.

Every AI response is validated with zod. Invalid JSON gets one retry, then a plain error.

### Card Store
`lib/store.ts`. Reads and writes `data/cards.json` (created if missing).
PRD ref: `prd.md > Save and Home List`.

## Data Model
```ts
type RecipeCard = {
  kind: "recipe"; id: string; sourceUrl: string; title: string;
  image: string;            // /media/<id>/frame-1.jpg or swapped-<n>.png
  imageIsGenerated: boolean;
  prepTimeMinutes: number; proteinGrams: number; calories: number;
  ingredients: { name: string; quantity: string; swapped?: boolean; original?: string }[];
  steps: string[];          // number of steps = steps.length
  savedAt?: string;
};

type WorkoutCard = {
  kind: "workout"; id: string; sourceUrl: string; title: string;
  frequency: string; rounds: number;
  exercises: { name: string; reps: string; image: string; swapped?: boolean; original?: string }[];
  swapCount: number;        // max 3
  savedAt?: string;
};
```

| Data | Where it lives | How it updates | When you leave and come back |
|---|---|---|---|
| Saved cards | `data/cards.json` on the laptop | Appended on Save | Still there, on any device |
| Frames and generated images | `public/media/<id>/` | Written during extract/apply | Still there (referenced by saved cards) |
| In-progress card on Convert | React state in the browser | Replaced after each apply | Discarded unless saved |
| Downloaded video | `tmp/` | Written by yt-dlp | Temporary; can be deleted |

## File Structure
```
ai-build/
├── app/
│   ├── layout.tsx              # fonts, colors, phone-width shell
│   ├── page.tsx                # Home: link box + saved list
│   ├── convert/page.tsx        # Convert view: original → swaps → Save
│   ├── cards/[id]/page.tsx     # Card Detail
│   └── api/
│       ├── extract/route.ts    # link/caption → card
│       ├── suggest/route.ts    # swap suggestions
│       ├── apply/route.ts      # apply swaps / make vegetarian / image
│       └── cards/
│           ├── route.ts        # list + save
│           └── [id]/route.ts   # one card
├── components/
│   ├── RecipeCard.tsx
│   ├── WorkoutCard.tsx
│   ├── SwapSheet.tsx
│   └── LinkInput.tsx
├── lib/
│   ├── validateLink.ts
│   ├── reel.ts                 # yt-dlp + ffmpeg
│   ├── store.ts                # data/cards.json
│   ├── schema.ts               # zod card schemas + TS types
│   └── ai/
│       ├── index.ts            # picks provider from AI_MODE
│       ├── prompts.ts
│       ├── openaiApi.ts
│       └── codexCli.ts
├── data/cards.json             # saved cards (gitignored)
├── public/media/               # frames + generated images (gitignored)
├── tmp/                        # downloaded videos (gitignored)
├── .env.example                # documents AI_MODE, CODEX_PATH, OPENAI_*
├── devpost/                    # Devpost learning workspace
└── README.md
```

## External Services and Dependencies
- **OpenAI API (API key mode).** Vision + JSON output via the Responses API, and the Images API for swap pictures. Auth: `OPENAI_API_KEY`. Pay per use; image generation is the most expensive call, so it runs only after an applied swap. Model names and exact request shapes are to be verified against https://platform.openai.com/docs at build time.
- **Codex CLI (Codex mode).** Run locally as `CODEX_PATH exec <prompt>` with images attached, reading the final message as JSON. Auth: your existing Codex login. Exact flags are to be verified with `codex exec --help`. https://github.com/openai/codex
- **yt-dlp.** `yt-dlp --write-info-json -o tmp/<id>.%(ext)s <url>`; the caption is in the info JSON's `description`. Free; Instagram may rate-limit or block it.
- **ffmpeg.** `ffmpeg -i tmp/<id>.mp4 -vf fps=<n> public/media/<id>/frame-%d.jpg`, tuned to produce 4–6 frames. Free.

## Important Failure Modes
- **Not a valid Instagram link** → "Wrong link" in the browser, with no server call.
- **yt-dlp blocked or the reel is private** → "Unable to access, please check," plus a "Paste the caption instead" box so the demo can continue.
- **The AI returns broken or unexpected JSON** → one automatic retry, then "Couldn't read this reel, try again."
- **The reel isn't a recipe or workout** → "This doesn't look like a recipe or workout."
- **No API key and no Codex path configured** → a banner on Home: "Add an OpenAI key or Codex path in .env.local."
- **Slow AI call** → a loading state on the button and card ("Adding tadka…").

## What Was Simplified and Why
- **Local app opened on your phone over Wi-Fi** instead of a native app or deployment, because Instagram blocks cloud servers and a native app adds a whole toolchain. The fuller version would need a hosted extraction service and app-store builds.
- **A JSON file** instead of a database, because there's one user and a small list. The fuller version would add a database and accounts.
- **Caption + frames** instead of full audio transcription, because recipe reels usually put the recipe in the caption, and transcription would add another tool. The fuller version would add speech-to-text for reels without captions.
- **No image generation in Codex mode**, because the Codex CLI doesn't generate images. A "swapped" badge on the reel frame stands in.
- **AI-estimated nutrition** instead of a nutrition database. The numbers are estimates and should be labeled "approx."

## Decisions and Open Issues
**Learner decisions:**
- Next.js on the laptop, used mostly on the phone. Familiar stack (Python, React, Next.js).
- **OpenAI as the AI provider**, with two modes: API key, and local Codex CLI via its path. This lets the build start before a key exists.
- Codex mode keeps the reel frame and adds a "swapped" badge; API key mode generates a new picture.

**Agent recommendations, accepted by the learner in review:**
- Saved cards in `data/cards.json` on the laptop, so phone and laptop share one list.
- yt-dlp + ffmpeg + caption for extraction, with a paste-caption fallback.
- Tailwind, zod, and the warm palette and fonts above.

**The useful unknown:** how to get content out of an Instagram reel, and whether a local agent (Codex) can act as the app's AI backend. Partly clarified: yt-dlp + ffmpeg get the caption and frames. **To verify in the first build steps:**
1. yt-dlp fetches a real public reel.
2. `codex exec` accepts images and returns parseable JSON.

The evidence for both is a working extraction on one real reel. This ties directly to the learning goal of working with an agent.

**Open:**
- Exact OpenAI model names and Codex flags (verify at build time).
- Nutrition numbers are AI estimates; label them "approx." on the card.
