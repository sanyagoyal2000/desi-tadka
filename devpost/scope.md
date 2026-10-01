---
doc: scope
status: approved
---

# Reel to Real (working name)

Paste a Western fitness reel (recipe or workout) and get a written, visual card translated for Indian kitchens and Indian ingredients, so you never have to rewatch the video.

## The Unique Kernel
A **cultural translator for fitness content**. Most fitness influencers online are Western, and their recipes and protein advice fit their bodies, diets, and grocery stores. This turns their reels into versions people in India can actually use: ingredients available in India and protein sources that fit Indian diets, written down and pictured instead of buried in a video.

## Who It's For
People in India who scroll Instagram fitness reels regularly. The learner is the first user and is vegetarian, but the target is Indian audiences broadly, not only vegetarians. Today they save or watch reels of recipes and workouts, can't relate to the protein requirements or ingredients, never cook the recipes, and don't have time to rewatch videos to follow a workout.

## The Core Loop
See a recipe or workout reel → paste it in → get a clean card → cook it or do it without rewatching. They come back every time a reel catches their eye.

## Inspiration & Identity
- Gamma (https://gamma.app) and Napkin (https://www.napkin.ai): the "messy input in, polished visual out" moment that amazes the learner.
- Strava and Cult.fit as fitness apps they love (for feel, not features to copy).
- Should feel like the reel became something real and usable.

## Why This Matters to the Learner
"I am a vegetarian so most of the times I am not able to relate with protein requirements and most recipes." They watch reels and videos regularly but "can't spend time watching videos again," and want the content written or pictorial instead.

## What "Working" Looks Like
The learner pastes an Instagram reel and a card appears:
- **Recipe reel →** Indian version (Indian ingredients) with ingredients, number of steps, the recipe steps, protein and calorie content, prep time, and pictures.
- **Workout reel →** workout name, reps, rounds, frequency, and images.

The "oh, that's cool" beat: a Western high-protein recipe reel becomes a card with Indian ingredients, ready to cook tonight.

## The POC Boundary
- Input: Instagram reels (primary). How content is pulled out of a reel is the main technical risk for the spec.
- Output: a recipe card (Indian-ingredient translation) and a workout card, with the fields listed above.
- Recipe translation is the star of the demo; the workout card uses the same pipeline.

## Open for the PRD
- How vegetarian fits: the learner is vegetarian, but the focus is Indian ingredients for India broadly (e.g. whether diet is a preference).
- Whether "pictures" means frames from the reel or generated illustrations.
- Whether the recipe card shows what changed (e.g. "chicken → paneer, +18g protein").

## Later
- YouTube video support.
- Saved library of past cards.
- Calorie and workout tracking, gym visits.
- Workout-length video queue for treadmill/cycling ("binge budget").
- Integration with the learner's existing workout app, Strava, or Cult.fit.

## Explicitly Cut
- **One-stop fitness app:** the crowded space the learner wanted to avoid; tracking is already covered by Strava, Cult.fit, and their own app.
- **Separate apps for recipes and workout queue:** would split a 2–4 hour build into two thin demos.
