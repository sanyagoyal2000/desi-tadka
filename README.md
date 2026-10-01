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

## How it works

1. `lib/reel.ts` downloads the reel with yt-dlp, reads the caption, and grabs 5 frames with ffmpeg.
2. `lib/ai/` sends frames + caption to the AI (Codex CLI or OpenAI API) and validates the JSON card with zod.
3. Swaps go through `/api/suggest` and `/api/apply`; recipes are rewritten with new protein/calories, and workouts replace the exercise everywhere.
4. Saved cards are stored in `data/cards.json` on the laptop.

Nutrition numbers are AI estimates.
