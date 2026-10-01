import { existsSync } from "node:fs";
import { z } from "zod";
import {
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
import { extractionPrompt, rewritePrompt, suggestPrompt } from "./prompts";
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

export async function extractCard(
  input: { id: string; sourceUrl: string; caption: string; frameFiles: string[]; frameUrls: string[] },
): Promise<{ kind: "other" } | { kind: "recipe"; card: RecipeCard } | { kind: "workout"; card: WorkoutCard }> {
  const x: Extraction = await ask(ExtractionSchema, extractionPrompt(input.caption, input.frameFiles.length), input.frameFiles);
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

export { MAX_WORKOUT_SWAPS };
export type { RecipeRewrite };
