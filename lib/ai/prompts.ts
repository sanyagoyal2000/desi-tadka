import type { Card, RecipeCard } from "../schema";

const AUDIENCE = `The audience is people in India who follow Western fitness influencers.
Prefer ingredients that are easy to buy in Indian kitchens, kiranas and supermarkets (paneer, dal, chana, rajma, soya chunks, curd/hung curd, besan, sattu, eggs, chicken, fish, millets, poha, atta, ghee, Indian spices, etc.).
Use Indian names where natural (e.g. "Paneer", "Hung curd", "Moong dal") and metric/Indian quantities (g, ml, cups, katori, tbsp).`;

export function extractionPrompt(caption: string, frameCount: number): string {
  return `You are reading an Instagram fitness reel. ${frameCount > 0 ? `${frameCount} still frames from the video are attached, in order (frame 1 = first).` : "No frames are available; use the caption only."}

Caption:
"""
${caption || "(no caption)"}
"""

Decide whether the reel is a "recipe", a "workout", or "other" (anything else).
Write down the ORIGINAL version exactly as the reel presents it. Do NOT adapt, translate, or substitute anything yet.

If recipe: title, prepTimeMinutes, the ingredients with quantities, clear numbered-style steps (no numbers in the text), and your best estimate of proteinGrams and calories PER SERVING. Leave frequency "", rounds 0, exercises [].
If workout: title, frequency "", rounds, and each exercise with reps (e.g. "12 reps", "30 sec"). For each exercise set "frame" to the 1-based frame that best shows it (0 if none). Leave ingredients [], steps [], numbers 0.
If other: title can describe it; leave everything else empty or 0.
heroFrame: the 1-based frame that best shows the finished dish or workout (0 if no frames).
Respond only with JSON matching the schema.`;
}

// A typed idea (no reel): invent an original card that already fits Indian kitchens.
export function ideaPrompt(idea: string): string {
  return `${AUDIENCE}

The user typed this idea:
"""
${idea}
"""

Decide whether they want a "recipe" or a "workout" ("other" only if it is clearly neither), then create one original, practical version of it.
If recipe: title, prepTimeMinutes, ingredients with quantities, clear steps (no numbers in the text), and your best estimate of proteinGrams and calories PER SERVING. Leave frequency "", rounds 0, exercises [].
If workout: title, frequency "", rounds, and 4-8 exercises with reps (e.g. "12 reps", "30 sec"); set each exercise frame to 0. Leave ingredients [], steps [], numbers 0.
heroFrame: 0.
Respond only with JSON matching the schema.`;
}

export function suggestPrompt(card: Card, item: string, hint?: string): string {
  if (card.kind === "recipe") {
    return `${AUDIENCE}

Recipe: ${card.title}
Ingredients: ${card.ingredients.map((i) => `${i.quantity} ${i.name}`).join("; ")}

Suggest 3 replacements for "${item}" that work in this dish, are easy to find in India, and keep the protein as high as possible.${hint ? ` The user also says: "${hint}".` : ""}
Each suggestion is just the ingredient name (max 4 words). Respond only with JSON.`;
  }
  return `Workout: ${card.title}
Exercises: ${card.exercises.map((e) => `${e.name} (${e.reps})`).join("; ")}

Suggest 3 alternative exercises to replace "${item}" that train similar muscles and need little or no gym equipment.${hint ? ` The user wants to focus on: "${hint}".` : ""}
Each suggestion is just the exercise name (max 4 words). Respond only with JSON.`;
}

export function suggestAllPrompt(card: Card): string {
  if (card.kind === "recipe") {
    return `${AUDIENCE}

Recipe: ${card.title}
Ingredients: ${card.ingredients.map((i) => `${i.quantity} ${i.name}`).join("; ")}

For EVERY ingredient, suggest 3 replacements that work in this dish, are easy to find in India, and keep the protein as high as possible.
Return one entry per ingredient, in order, with "item" set to the ingredient name exactly as written above. Each suggestion is just the ingredient name (max 4 words). Respond only with JSON.`;
  }
  return `Workout: ${card.title}
Exercises: ${card.exercises.map((e) => `${e.name} (${e.reps})`).join("; ")}

For EVERY distinct exercise, suggest 3 alternatives that train similar muscles and need little or no gym equipment.
Return one entry per exercise, with "item" set to the exercise name exactly as written above. Each suggestion is just the exercise name (max 4 words). Respond only with JSON.`;
}

export function rewritePrompt(card: RecipeCard, instruction: string): string {
  return `${AUDIENCE}

Here is a recipe as JSON:
${JSON.stringify({ title: card.title, proteinGrams: card.proteinGrams, calories: card.calories, ingredients: card.ingredients.map(({ name, quantity }) => ({ name, quantity })), steps: card.steps })}

${instruction}

Rules:
- Return the ingredients list in the SAME ORDER and with the SAME NUMBER of items. Only change the ingredients you are told to change; copy the others exactly.
- Adjust quantities of replaced ingredients so the dish still works.
- Rewrite the steps so they use the new ingredients (cooking times/methods may change).
- Recalculate proteinGrams and calories per serving for the new version (estimates).
- Keep the title close to the original but reflect the main swap if it changes the dish (e.g. "Paneer Tikka Wrap").
Respond only with JSON.`;
}
