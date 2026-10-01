import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { MEDIA_DIR, mediaUrl } from "../paths";
import { z } from "zod";
import {
  AllSuggestionsSchema,
  ExtractionSchema,
  MAX_WORKOUT_SWAPS,
  RecipeRewriteSchema,
  SuggestionsSchema,
  toStrictJsonSchema,
  type Card,
  type Extraction,
  type RecipeCard,
  type RecipeRewrite,
  type WorkoutCard,
} from "../schema";
import { codexProvider } from "./codexCli";
import { openaiProvider } from "./openaiApi";
import { extractionPrompt, ideaPrompt, rewritePrompt, suggestAllPrompt, suggestPrompt } from "./prompts";
import type { AIProvider } from "./types";

export class AIConfigError extends Error {}
export class AIResponseError extends Error {}

// Picks the backend from AI_MODE (spec.md > AI Provider). Returns null if it isn't set up.
export function getProvider(): AIProvider | null {
  const mode = process.env.AI_MODE || (process.env.OPENAI_API_KEY ? "api" : "codex");
  if (mode === "api") {
    const key = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;
    return key && model ? openaiProvider(key, model, process.env.OPENAI_IMAGE_MODEL || undefined) : null;
  }
  const codexPath = process.env.CODEX_PATH;
  return codexPath && existsSync(codexPath) ? codexProvider(codexPath) : null;
}

function requireProvider(): AIProvider {
  const p = getProvider();
  if (!p) throw new AIConfigError("Add an OpenAI key or Codex path in .env.local.");
  return p;
}

// Ask for JSON, validate with zod, retry once on bad output (spec.md > API Routes).
async function ask<T>(schema: z.ZodType<T>, prompt: string, images: string[] = [], check?: (v: T) => boolean): Promise<T> {
  const provider = requireProvider();
  const jsonSchema = toStrictJsonSchema(schema);
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const parsed = schema.safeParse(await provider.completeJSON(prompt, jsonSchema, images));
      if (parsed.success && (!check || check(parsed.data))) return parsed.data;
      lastError = parsed.success ? new Error("Response failed sanity check") : parsed.error;
    } catch (err) {
      lastError = err;
    }
    console.error(`[ai] attempt ${attempt + 1} failed:`, String(lastError).slice(0, 500));
  }
  throw new AIResponseError(String(lastError));
}

type Extracted = { kind: "other" } | { kind: "recipe"; card: RecipeCard } | { kind: "workout"; card: WorkoutCard };

export async function extractCard(input: { id: string; sourceUrl: string; caption: string; frameFiles: string[]; frameUrls: string[] }): Promise<Extracted> {
  const x: Extraction = await ask(ExtractionSchema, extractionPrompt(input.caption, input.frameFiles.length), input.frameFiles);
  return toCard(x, input);
}

// Typed idea → original card. No reel frames, so recipes get a drawn picture in API mode.
export async function ideaToCard(id: string, idea: string): Promise<Extracted> {
  const x: Extraction = await ask(ExtractionSchema, ideaPrompt(idea));
  return toCard(x, { id, sourceUrl: "", frameUrls: [] });
}

export async function pictureFor(card: RecipeCard): Promise<RecipeCard> {
  return withNewPicture(card);
}

function toCard(x: Extraction, input: { id: string; sourceUrl: string; frameUrls: string[] }): Extracted {
  const frame = (n: number) => input.frameUrls[n - 1] ?? input.frameUrls[0] ?? "";
  const base = { id: input.id, sourceUrl: input.sourceUrl, title: x.title };

  if (x.kind === "recipe" && x.ingredients.length > 0) {
    return {
      kind: "recipe",
      card: {
        ...base,
        kind: "recipe",
        image: frame(x.heroFrame),
        imageIsGenerated: false,
        prepTimeMinutes: Math.round(x.prepTimeMinutes),
        proteinGrams: Math.round(x.proteinGrams),
        calories: Math.round(x.calories),
        ingredients: x.ingredients,
        steps: x.steps,
      },
    };
  }
  if (x.kind === "workout" && x.exercises.length > 0) {
    return {
      kind: "workout",
      card: {
        ...base,
        kind: "workout",
        frequency: x.frequency,
        rounds: Math.max(1, x.rounds),
        exercises: x.exercises.map((e) => ({ name: e.name, reps: e.reps, image: e.frame > 0 ? frame(e.frame) : frame(x.heroFrame) })),
        swapCount: 0,
      },
    };
  }
  return { kind: "other" };
}

export async function suggestSwaps(card: Card, item: string, hint?: string): Promise<string[]> {
  const { suggestions } = await ask(SuggestionsSchema, suggestPrompt(card, item, hint));
  return suggestions.slice(0, 4);
}

// Suggestions for every item at once, keyed by lower-cased name.
export async function suggestAllSwaps(card: Card): Promise<Record<string, string[]>> {
  const { items } = await ask(AllSuggestionsSchema, suggestAllPrompt(card));
  return Object.fromEntries(items.filter((x) => x.suggestions.length).map((x) => [norm(x.item), x.suggestions.slice(0, 4)]));
}

// Rewrites the recipe per `instruction`, then marks every ingredient whose name changed as swapped.
async function rewriteRecipe(card: RecipeCard, instruction: string, forced: Set<number> = new Set()): Promise<RecipeCard> {
  const r: RecipeRewrite = await ask(RecipeRewriteSchema, rewritePrompt(card, instruction), [], (v) => v.ingredients.length === card.ingredients.length);
  const ingredients = r.ingredients.map((next, i) => {
    const prev = card.ingredients[i];
    const changed = forced.has(i) || norm(next.name) !== norm(prev.name);
    if (!changed) return { ...prev, quantity: next.quantity || prev.quantity };
    return { name: next.name, quantity: next.quantity, swapped: true, original: prev.original ?? `${prev.quantity} ${prev.name}`.trim() };
  });
  return {
    ...card,
    title: r.title || card.title,
    proteinGrams: Math.round(r.proteinGrams),
    calories: Math.round(r.calories),
    ingredients,
    steps: r.steps.length ? r.steps : card.steps,
  };
}

const norm = (s: string) => s.trim().toLowerCase();

export async function applyRecipeSwap(card: RecipeCard, index: number, replacement: string): Promise<RecipeCard> {
  const target = card.ingredients[index];
  if (!target) throw new AIResponseError("No such ingredient");
  const updated = await rewriteRecipe(
    card,
    `Replace ingredient #${index + 1} "${target.quantity} ${target.name}" with "${replacement}". Keep every other ingredient exactly as it is.`,
    new Set([index]),
  );
  // Keep the user's own wording for the swapped ingredient name.
  updated.ingredients[index] = { ...updated.ingredients[index], name: replacement.trim() || updated.ingredients[index].name };
  return withNewPicture(updated);
}

// Same ingredient, new amount: protein and calories are recalculated; no new picture.
export async function changeQuantity(card: RecipeCard, index: number, quantity: string): Promise<RecipeCard> {
  const target = card.ingredients[index];
  if (!target) throw new AIResponseError("No such ingredient");
  const updated = await rewriteRecipe(
    card,
    `Change the amount of ingredient #${index + 1} "${target.name}" from "${target.quantity}" to "${quantity}". Keep its name and every other ingredient exactly as they are; only adjust steps if the amount matters there.`,
    new Set([index]),
  );
  const was = target.original ?? (target.quantity.trim() ? `${target.quantity} ${target.name}` : "no amount");
  updated.ingredients[index] = { ...updated.ingredients[index], name: target.name, quantity, original: was };
  return updated;
}

export async function makeVegetarian(card: RecipeCard): Promise<RecipeCard> {
  const updated = await rewriteRecipe(
    card,
    `Make this recipe Indian-vegetarian: replace EVERY ingredient that contains meat, poultry, fish, seafood, eggs, or gelatin with a vegetarian, high-protein ingredient easy to find in India (e.g. paneer, tofu, soya chunks, chana, rajma, dal). Leave vegetarian ingredients unchanged.`,
  );
  return updated.ingredients.some((i, n) => i.swapped && !card.ingredients[n].swapped) ? withNewPicture(updated) : updated;
}

// API mode: draw the swapped dish. Codex mode: keep the reel frame (the card shows a "swapped" badge).
async function withNewPicture(card: RecipeCard): Promise<RecipeCard> {
  const provider = requireProvider();
  const n = Date.now().toString(36);
  const dir = path.join(MEDIA_DIR, card.id);
  await mkdir(dir, { recursive: true });
  const file = `swapped-${n}.png`;
  const prompt = `Appetizing overhead food photo of "${card.title}", home-cooked in an Indian kitchen, made with ${card.ingredients
    .map((i) => i.name)
    .join(", ")}. Warm natural light, steel or ceramic plate, no text.`;
  try {
    if (await provider.generateImage(prompt, path.join(dir, file))) return { ...card, image: mediaUrl(card.id, file), imageIsGenerated: true };
  } catch (err) {
    console.error("[ai] image generation failed:", String(err).slice(0, 300));
  }
  return card;
}

export class SwapLimitError extends Error {}

// Workout swaps need no AI rewrite: replace every occurrence of the exercise by name (prd.md > Workout Swaps).
export async function applyWorkoutSwap(card: WorkoutCard, index: number, replacement: string): Promise<WorkoutCard> {
  const target = card.exercises[index];
  if (!target) throw new AIResponseError("No such exercise");
  if (card.swapCount >= MAX_WORKOUT_SWAPS) throw new SwapLimitError(`You've used all ${MAX_WORKOUT_SWAPS} swaps — this keeps it the original plan.`);

  let image: string | null = null;
  const provider = getProvider();
  if (provider) {
    const dir = path.join(MEDIA_DIR, card.id);
    await mkdir(dir, { recursive: true });
    const file = `swapped-${Date.now().toString(36)}.png`;
    try {
      if (await provider.generateImage(`Clean fitness illustration of a person doing "${replacement}", side view, plain warm background, no text.`, path.join(dir, file))) {
        image = mediaUrl(card.id, file);
      }
    } catch (err) {
      console.error("[ai] image generation failed:", String(err).slice(0, 300));
    }
  }

  const name = norm(target.name);
  return {
    ...card,
    swapCount: card.swapCount + 1,
    exercises: card.exercises.map((ex) =>
      norm(ex.name) === name
        ? { ...ex, name: replacement, image: image ?? ex.image, swapped: true, original: ex.original ?? ex.name }
        : ex,
    ),
  };
}

export { MAX_WORKOUT_SWAPS };
