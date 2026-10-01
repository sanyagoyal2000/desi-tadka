---
doc: prd
status: approved
---

# DesiTadka — Product Requirements

DesiTadka turns Western fitness reels into recipes and workouts people in India can actually use: paste a reel link, see the original, swap what doesn't fit, and save it to your own collection.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
Develops `scope.md > The Core Loop`.

1. The user opens DesiTadka and lands on the **Home** screen: a list of their saved recipe and workout cards, plus a box to paste a video link.
2. They paste an Instagram reel link (recipe or workout) and submit.
3. DesiTadka shows the **original** version from the reel as a card.
   - **Recipe:** the recipe as shown in the reel.
   - **Workout:** the plan as-is.
4. DesiTadka asks if they want to change anything.
   - **Recipe:** "Do you want me to convert this?" Each ingredient has a swap icon. The user can also convert the whole recipe to vegetarian in one go.
   - **Workout:** "Want to change anything? Tell me what to focus on." The user can swap up to 3 exercises.
5. The user taps a swap icon. AI suggests replacements (Indian ingredients for recipes), or the user types their own.
6. Swapped items are highlighted in a different color. For recipes, protein and calories update to match the new version.
7. The user taps **Save**. The final version is added to their Home list.
8. Later, they tap a saved card on Home to see its details and cook or work out without rewatching the reel.

Success: a Western recipe reel becomes a highlighted, Indian-ingredient version with updated protein and calories, saved to Home.

## Screens and Layout
- **Home:** link input box at the top and a list of saved cards (recipes and workouts) below it. Tapping a card opens Card Detail.
- **Convert view:** shows the card generated from the pasted reel, with swap icons and a Save button. The user goes here after submitting a link.
- **Card Detail:** read-only view of a saved card (the final version). The user goes here from Home.

## Look and Feel
- Name: **DesiTadka**.
- Mood: **warm and spicy**.
- Inspirations: Gamma and Napkin (polished, visual output rather than chat text), Strava and Cult.fit (fitness-app feel).
- Output should look like a **visual card**, not a block of chat text. This is part of what separates it from asking ChatGPT.
- Swapped items use a distinct highlight color.

## Features and Behavior

### Paste a Reel
Source: `scope.md > The POC Boundary`.
- The user pastes an Instagram reel link into the Home box and submits.
- **First round of validation:** as soon as a link is entered, DesiTadka checks it's a valid link before processing. An invalid link shows "Wrong link."
- If the link is valid but the reel can't be accessed, it shows "Unable to access, please check."
- DesiTadka works out whether it's a recipe or a workout and shows the matching card type.
  - [ ] Pasting a recipe reel link shows a recipe card with the original recipe.
  - [ ] Pasting a workout reel link shows a workout card with the original plan.
  - [ ] Entering something that isn't a valid link shows "Wrong link" without processing.
  - [ ] A valid link that can't be accessed shows "Unable to access, please check."

### Recipe Card
Source: `scope.md > What "Working" Looks Like`.
Shows: dish name, ingredients, number of steps, the recipe steps, protein, calories, prep time, and a picture.
- **Pictures:** the original card uses a frame from the reel. After a swap, the picture is AI-generated to show the new version.
  - [ ] All listed fields appear on the card for a recipe reel.
  - [ ] The original card shows a frame from the reel; after a swap, an AI-generated picture of the new version appears.

### Recipe Swaps (the star)
Source: `scope.md > The Unique Kernel`.
- After the original shows, DesiTadka asks whether to convert it.
- Every ingredient has a swap icon. Tapping it shows AI suggestions for Indian alternatives, or the user can type their own.
- A "make it vegetarian" option converts the whole recipe at once.
- Swapped ingredients are highlighted in a different color.
- Protein and calories update to reflect the new ingredients.
  - [ ] Tapping a swap icon shows at least one Indian-ingredient suggestion.
  - [ ] Typing a custom replacement swaps that ingredient.
  - [ ] "Make it vegetarian" replaces every non-vegetarian ingredient.
  - [ ] Swapped ingredients are visibly highlighted; unswapped ones aren't.
  - [ ] Protein and calorie numbers change after a swap that affects them.

### Workout Card
Source: `scope.md > What "Working" Looks Like`.
Shows: workout name, exercises, reps, rounds, frequency, and images.
- **Images:** frames from the reel for original exercises; AI-generated images for swapped-in exercises.
  - [ ] All listed fields appear on the card for a workout reel.

### Workout Swaps
- After the plan shows, DesiTadka asks whether to change anything or focus on something.
- The user can swap up to 3 exercises, using the same swap-icon pattern as recipes (assumption — see Product Decisions). Swapping an exercise replaces it everywhere it appears in the plan (e.g. "no deadlifts").
- Swapped exercises are highlighted.
  - [ ] Swapping an exercise replaces every occurrence of it in the plan.
  - [ ] A 4th swap is blocked with a short message.

### Save and Home List
- Nothing is saved until the user taps **Save**.
- Saved cards appear on Home, showing the final (swapped) version.
- Tapping a saved card opens Card Detail with the full recipe or workout.
  - [ ] After Save, the card appears in the Home list.
  - [ ] Saved cards are still there after closing and reopening the app.
  - [ ] Tapping a saved card shows the final version, with swaps applied.

## States and Boundaries
- **First use / empty Home:** no saved cards yet. Home shows the link box and an empty-list message inviting them to paste their first reel.
- **Loading:** after submitting a link, the user sees that DesiTadka is working on it.
- **Invalid link:** checked as soon as it's entered; shows "Wrong link."
- **Link can't be accessed:** shows "Unable to access, please check."
- **Video isn't a recipe or workout:** shows a short message saying so (assumption — see Product Decisions).
- **Unsaved card:** leaving the Convert view without tapping Save discards it.
- **Persistence:** saved cards persist between sessions.

## Product Decisions
- **Show the original first, then offer to convert** — makes the before → after translation visible.
- **User-directed swaps, not a menu of variations** — the user chooses what to change.
- **Max 3 exercise swaps per workout** — keeps the plan recognizably the original.
- **Highlight changed items** — shows what was translated at a glance.
- **Nutrition updates after swaps** — the protein/calorie impact is part of the point.
- **Reel frames for originals, AI images after swaps** — the original looks like the reel; the swapped version shows what you'll actually make.
- **Validate the link first** — catch a wrong link before doing any work.
- **Save only on tap** — the user decides what's worth keeping.
- **Saved collection is in** — "otherwise what is the point, this is what GPT already does." The collection is what makes it a product, not a one-off conversion.
- **Name: DesiTadka; look: warm and spicy.**
- **Assumption:** the workout card uses the same swap-icon pattern as recipes.
- **Assumption:** a reel that isn't a recipe or workout gets a short "not a recipe or workout" message.

## What We're Building
- Home: link box + saved cards list.
- Paste an Instagram reel link → recipe or workout card with the original.
- Recipe swaps with AI Indian-ingredient suggestions or custom input, "make it vegetarian," highlighting, and updated protein/calories.
- Workout swaps (max 3), replacing every occurrence, with highlighting.
- Save → Home list; tap to view details; saved cards persist.

## Deferred From the POC
- **Tracker (what you did, calories eaten)** — `scope.md > Later`; not needed to prove the translation.
- **YouTube links** — `scope.md > Later`; reels first.
- **Accounts / sync across devices** — a saved list on one device is enough for the demo.
- **Editing or deleting saved cards** — not needed to prove the idea.

## Possible Later Enhancements
- Workout-length video queue for treadmill and cycling.
- Integration with the learner's own workout app, Strava, or Cult.fit.
- Diet preferences (vegetarian, eggetarian, Jain) applied automatically.

## Non-Goals
- **A one-stop fitness app** — the crowded space scope cut on purpose.
- **A chat interface** — output is a visual card, not chat text.
- **Unlimited workout rewrites** — max 3 swaps keeps it the original plan.

## Open Questions
- **Getting content out of an Instagram reel:** technical; solved in `4-spec`, and may affect what "paste a link" looks like.
