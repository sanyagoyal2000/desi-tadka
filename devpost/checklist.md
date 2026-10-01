---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast (learner asked to build everything, then get one explanation of logic and files)

## Slices

- [x] **1. Paste a real reel link and see what DesiTadka pulled out of it**
  Becomes usable: A running DesiTadka app (warm look, phone-width) where pasting an Instagram reel link shows "Wrong link" for bad input, or the reel's caption and 4–6 extracted frames. An inaccessible reel shows "Unable to access, please check" plus a paste-the-caption box.
  Why now: Getting content out of a reel is the biggest unknown in the whole plan (`spec.md > Decisions and Open Issues`, item 1). If yt-dlp can't fetch reels, everything else changes, so we find out first. Scaffolding rides along.
  PRD ref: `prd.md > Paste a Reel`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Stack`, `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Look and Feel`, `spec.md > Components` (Link Validation, Reel Extractor, API Routes), `spec.md > File Structure`, `spec.md > Important Failure Modes`
  Build: Install yt-dlp; scaffold Next.js + TypeScript + Tailwind with Baloo 2/Inter and the palette; `.gitignore` for `data/`, `public/media/`, `tmp/`; `.env.example`; `lib/validateLink.ts`; `lib/reel.ts` (yt-dlp → caption, ffmpeg → frames); `POST /api/extract` returning caption + frame paths for now (or accepting `{ caption }`); Home page with `LinkInput` and a loading state; temporary Convert view that shows caption and frames.
  Verify (mechanical): `npm run build` passes; `curl` `/api/extract` with one real public recipe reel returns a caption and 4–6 frame files exist in `public/media/<id>/`; a non-Instagram URL is rejected with "Wrong link"; a bogus reel ID returns the "Unable to access" error.
  Learner check: Start the dev server, open it on your phone or in phone-size view, paste a recipe reel you've saved, and check that the caption and frames match the reel. Then paste "hello" and a fake reel link to see both error messages.
  Commit: `Scaffold DesiTadka and extract caption and frames from a reel`

- [x] **2. The reel becomes an original recipe or workout card**
  Becomes usable: Pasting a reel shows a polished visual card: a recipe card (name, frame, prep time, protein, calories marked "approx.", ingredients, step count, steps) or a workout card (name, frequency, rounds, exercises with reps and frames). Non-recipe/workout reels say "This doesn't look like a recipe or workout." Missing AI config shows a banner on Home.
  Why now: The second unknown — whether the Codex CLI can act as the app's AI backend and return valid JSON from images. It also produces the "original" half of the before → after that the kernel needs.
  PRD ref: `prd.md > The Core Journey` (steps 2–3), `prd.md > Recipe Card`, `prd.md > Workout Card`
  Spec ref: `spec.md > Data Model`, `spec.md > Components` (AI Provider, OpenAI API Provider, Codex CLI Provider, Recipe Card and Workout Card, Convert View), `spec.md > External Services and Dependencies`
  Build: Install Codex CLI and check `codex exec --help`; `lib/schema.ts` (zod); `lib/ai/prompts.ts`, `index.ts`, `codexCli.ts`, `openaiApi.ts` with `extractCard` (one retry on invalid JSON); wire `/api/extract` to return `{ kind, card }`; `RecipeCard` and `WorkoutCard` components; Convert view renders the right card; "other" message; missing-config banner.
  Verify (mechanical): `npm run build` passes; `/api/extract` on one real recipe reel and one workout reel each return JSON that passes the zod schema with `kind` set correctly; the caption fallback also returns a valid card; with no AI config the banner appears.
  Learner check: Paste a Western recipe reel and a workout reel. Does each card capture what the reel actually shows, and does it look like a card you'd want to cook or train from?
  Commit: `Turn reels into original recipe and workout cards`

- [x] **3. Swap ingredients into Indian versions (the star)**
  Becomes usable: On a recipe card, "Add some tadka?" prompt; each ingredient has a ↺ swap icon that opens a sheet with AI Indian-ingredient suggestions or a type-your-own box. Applying a swap highlights it in turmeric, shows what it replaced, and updates protein and calories. "Make it vegetarian" converts all non-veg ingredients at once. In API mode a new picture is generated; in Codex mode the frame gets a "swapped" badge.
  Why now: This is the unique kernel — the cultural translation. It comes right after we can produce an original card, so it gets the most build and feedback time.
  PRD ref: `prd.md > Recipe Swaps (the star)`, `prd.md > The Core Journey` (steps 4–6), `prd.md > Recipe Card` (pictures)
  Spec ref: `spec.md > Components` (AI Provider, Swap Sheet, Convert View, API Routes), `spec.md > Data Model`
  Build: `suggestSwaps`, `applySwaps`, `makeVegetarian`, `generateImage` in both providers; `/api/suggest` and `/api/apply`; `SwapSheet`; swap icons, highlight, and "was: …" note on `RecipeCard`; "Make it vegetarian" button; swapped badge / generated image.
  Verify (mechanical): `npm run build` passes; via `curl`, `/api/suggest` for "chicken breast" returns ≥1 Indian suggestion; `/api/apply` with one swap returns a schema-valid card with that ingredient marked `swapped` and changed protein/calories; `makeVegetarian` on a chicken recipe leaves no meat/fish ingredients unmarked; a custom typed swap is applied as typed.
  Learner check: Take a Western high-protein recipe reel, swap one ingredient using a suggestion, type your own for another, then try "Make it vegetarian." Do the swaps make sense for an Indian kitchen, and can you tell at a glance what changed?
  Commit: `Add Indian ingredient swaps, make-it-vegetarian, and nutrition updates`

- [x] **4. Swap up to 3 exercises in a workout**
  Becomes usable: On a workout card, "Want to change anything?" prompt with swap icons per exercise; suggestions or your own. A swap replaces that exercise everywhere in the plan and highlights it; a counter shows swaps left; a 4th swap is blocked with a short message.
  Why now: Reuses the swap pipeline from slice 3, so it's cheap once that works, and keeps the second card type complete before we save anything.
  PRD ref: `prd.md > Workout Swaps`
  Spec ref: `spec.md > Components` (AI Provider, Swap Sheet, Recipe Card and Workout Card), `spec.md > Data Model` (`swapCount`)
  Build: Extend suggest/apply prompts for exercises; enforce max 3 on server and in UI; swap icons, highlight, and counter on `WorkoutCard`.
  Verify (mechanical): `npm run build` passes; `/api/apply` on a workout with a repeated exercise replaces every occurrence and increments `swapCount`; a 4th swap is rejected by the API with a clear error.
  Learner check: Paste a workout reel, swap an exercise you'd skip, try to make a 4th swap, and confirm the plan still feels like the original.
  Commit: `Add workout exercise swaps with a 3-swap limit`

- [x] **5. Save cards to Home and open them later**
  Becomes usable: Tapping Save adds the final, swapped card to the Home list (name, type tag, thumbnail). Tapping a saved card opens a read-only Card Detail. Cards survive restarting the server and are visible from both phone and laptop. Empty Home invites you to paste your first reel. Leaving Convert without Save discards the card.
  Why now: Completes the core journey and turns one-off conversions into your collection ("otherwise what is the point"). It's lowest-risk, so it comes last.
  PRD ref: `prd.md > Save and Home List`, `prd.md > Screens and Layout`, `prd.md > The Core Journey` (steps 7–8), `prd.md > States and Boundaries`
  Spec ref: `spec.md > Components` (Card Store, Home Page, Card Detail Page, API Routes), `spec.md > Data Model`
  Build: `lib/store.ts` for `data/cards.json`; `GET/POST /api/cards` and `GET /api/cards/[id]`; Save button on Convert; saved list and empty state on Home; `app/cards/[id]/page.tsx` reusing the card components in read-only mode.
  Verify (mechanical): `npm run build` passes; POST a swapped card, restart the dev server, and `GET /api/cards` still returns it with `swapped` flags intact; `GET /api/cards/<id>` returns it; Home and Card Detail render without errors.
  Learner check: Run the full journey on your phone: paste a recipe reel, swap, Save, see it on Home, restart the app, and open it from Home without rewatching the reel.
  Commit: `Save cards to Home and view saved card details`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — folded into the final review session at the learner's request (see Revisions)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [what actually happened; real document/test/code references; unfinished work if interrupted]
Route and stops: [actual paths and symbols; guided stops completed, or reference-only route]
Edit outcome: [tried/kept/reverted/declined/not applicable; verification if changed]
Reflection: [offered/answered/declined/already covered — personal answer belongs only in the ignored profile]
Activity mode: [live app and editor, explicit static fallback, focused alternative, prior practice, or recap]

## Revisions

- Early hands-on checkpoint moved from after slice 3 into the final review — learner chose fast mode and asked to build everything first, then review.
- Frames and generated images live in `data/media/<id>/` and are served by `app/api/media/[...path]/route.ts`, not `public/media/` — Next.js doesn't reliably serve files added to `public/` after the server starts.
- Added optional `YTDLP_COOKIES_BROWSER` and an ffprobe fallback for video length — yt-dlp got blocked on one public reel and Instagram didn't always report a duration, which left a single frame.
- Codex CLI is used from the ChatGPT desktop app (`/Applications/ChatGPT.app/Contents/Resources/codex`, already logged in) instead of a separate install; it takes `-i` images, `--output-schema`, and `-o`, and returned valid JSON in ~10–15s.
- Slice 2's real-reel check ran on a public non-food reel (frames + caption → correctly "other"); recipe and workout parsing were verified via the caption path because no public recipe/workout reel URL was at hand — the learner tests with their own saved reels at final review.
- Added `GET /api/status` so Home can show the missing-setup banner; providers share one `completeJSON` + zod + retry path in `lib/ai/index.ts` instead of duplicating each function per provider.
