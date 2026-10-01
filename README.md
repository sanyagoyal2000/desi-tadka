# DesiTadka 🌶️

Paste a Western fitness reel from Instagram and get a recipe or workout you can actually use in India. You see the original first, swap anything that doesn't fit (Indian-ingredient suggestions, "Make it vegetarian", up to 3 exercise swaps), and save the final version to your own collection.

## Run it

Requirements: Node 20+, `yt-dlp` and `ffmpeg` (`brew install yt-dlp ffmpeg`), plus either the Codex CLI (logged in) or an OpenAI API key.

```bash
cp .env.example .env.local   # pick AI_MODE=codex or AI_MODE=api and fill in the matching values
npm install
npm run dev -- -H 0.0.0.0
```

- Laptop: http://localhost:3000
- Phone on the same Wi-Fi: `http://<your-laptop-ip>:3000` (find the IP with `ipconfig getifaddr en0`)

If Instagram blocks a reel, either set `YTDLP_COOKIES_BROWSER=chrome` in `.env.local` or use the "Paste the caption instead" box.

## Share reels straight from Instagram (iPhone)

Set up once in the **Shortcuts** app, then any reel goes to DesiTadka from Instagram's Share menu — no copying links. Works while the laptop is running the app and the iPhone is on the same Wi-Fi.

1. Shortcuts → **+** → name it **DesiTadka**.
2. Tap the **ⓘ** (Details) button → turn on **Show in Share Sheet** → under share sheet types keep only **URLs** and **Text**.
3. Add the action **URL Encode** (it uses *Shortcut Input*).
4. Add the action **Text** and type `http://<your-laptop-name>.local:3000/?url=`, then insert the **URL Encoded Text** variable right after `=`. Find the name with `scutil --get LocalHostName` (or use the laptop's IP instead of `<name>.local`).
5. Add the action **Open URLs** (it uses the Text from step 4). Done.

In Instagram: tap **Share** (paper plane) on a reel → **Share to…** / **More** → **DesiTadka**. Safari opens DesiTadka and starts making the card. Tip: tap **Edit Actions** in that menu to add DesiTadka to Favorites so it sits at the top.

## Reminders and My routine

- **Remind me** (on a saved card): pick a day and time → it goes on your Plan and opens a calendar event (`/api/reminder`, an `.ics` file). On iPhone, Safari shows **Add to Calendar**; the phone's own alert is the nudge.
- **My routine**: on a saved workout, tap **+ Routine** on any single exercise. They collect on Home under *My routine* (`data/routine.json`), with a **weekly nudge** (pick days + time) that repeats in your calendar.

## Put it online (Oracle Cloud, free)

See [DEPLOY.md](DEPLOY.md): Docker + HTTPS + an access code, so your iPhone can use DesiTadka without the laptop.

## How it works

1. `lib/reel.ts` downloads the reel with yt-dlp, reads the caption, and grabs 5 frames with ffmpeg.
2. `lib/ai/` sends frames + caption to the AI (Codex CLI or OpenAI API) and validates the JSON card with zod.
3. Swaps go through `/api/suggest` and `/api/apply`; recipes are rewritten with new protein/calories, and workouts replace the exercise everywhere.
4. Saved cards are stored in `data/cards.json`, the plan in `data/plan.json`, and routine exercises in `data/routine.json`, all on the laptop.

Nutrition numbers are AI estimates.
