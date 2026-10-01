import { z } from "zod";

// ---- Cards as the app stores and renders them (spec.md > Data Model) ----

export const IngredientSchema = z.object({
  name: z.string(),
  quantity: z.string(),
  swapped: z.boolean().optional(),
  original: z.string().optional(),
});

export const RecipeCardSchema = z.object({
  kind: z.literal("recipe"),
  id: z.string(),
  sourceUrl: z.string(),
  title: z.string(),
  image: z.string(),
  imageIsGenerated: z.boolean(),
  prepTimeMinutes: z.number(),
  proteinGrams: z.number(),
  calories: z.number(),
  ingredients: z.array(IngredientSchema),
  steps: z.array(z.string()),
  savedAt: z.string().optional(),
  favorite: z.boolean().optional(),
});

export const ExerciseSchema = z.object({
  name: z.string(),
  reps: z.string(),
  image: z.string(),
  swapped: z.boolean().optional(),
  original: z.string().optional(),
});

export const WorkoutCardSchema = z.object({
  kind: z.literal("workout"),
  id: z.string(),
  sourceUrl: z.string(),
  title: z.string(),
  frequency: z.string(),
  rounds: z.number(),
  exercises: z.array(ExerciseSchema),
  swapCount: z.number().max(3),
  savedAt: z.string().optional(),
  favorite: z.boolean().optional(),
});

export const CardSchema = z.discriminatedUnion("kind", [RecipeCardSchema, WorkoutCardSchema]);

export type Ingredient = z.infer<typeof IngredientSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type RecipeCard = z.infer<typeof RecipeCardSchema>;
export type WorkoutCard = z.infer<typeof WorkoutCardSchema>;
export type Card = z.infer<typeof CardSchema>;

export const MAX_WORKOUT_SWAPS = 3;

// ---- Plan: card ids per calendar date, "YYYY-MM-DD" (data/plan.json) ----

export const PlanSchema = z.object({
  days: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.array(z.string())),
});
export type Plan = z.infer<typeof PlanSchema>;
export const emptyPlan = (): Plan => ({ days: {} });

// ---- Shapes the AI must return. Kept flat and fully "required" so both the
// OpenAI API (strict JSON schema) and `codex exec --output-schema` accept them. ----

export const ExtractionSchema = z.object({
  kind: z.enum(["recipe", "workout", "other"]),
  title: z.string(),
  heroFrame: z.number().int(),
  prepTimeMinutes: z.number(),
  proteinGrams: z.number(),
  calories: z.number(),
  ingredients: z.array(z.object({ name: z.string(), quantity: z.string() })),
  steps: z.array(z.string()),
  frequency: z.string(),
  rounds: z.number().int(),
  exercises: z.array(z.object({ name: z.string(), reps: z.string(), frame: z.number().int() })),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

export const SuggestionsSchema = z.object({ suggestions: z.array(z.string()).min(1) });

export const RecipeRewriteSchema = z.object({
  title: z.string(),
  proteinGrams: z.number(),
  calories: z.number(),
  ingredients: z.array(z.object({ name: z.string(), quantity: z.string() })),
  steps: z.array(z.string()),
});
export type RecipeRewrite = z.infer<typeof RecipeRewriteSchema>;

// Strict JSON Schema (draft 2020-12 subset) generated from a zod object,
// with every property required and no extras — what structured outputs expect.
export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-2020-12" }) as Record<string, unknown>;
  delete json.$schema;
  return tighten(json);
}

function tighten(node: unknown): Record<string, unknown> {
  if (!node || typeof node !== "object") return node as Record<string, unknown>;
  const n = { ...(node as Record<string, unknown>) };
  delete n.minItems;
  delete n.maximum;
  delete n.minimum;
  if (n.type === "object" && n.properties) {
    const props = n.properties as Record<string, unknown>;
    n.properties = Object.fromEntries(Object.entries(props).map(([k, v]) => [k, tighten(v)]));
    n.required = Object.keys(props);
    n.additionalProperties = false;
  }
  if (n.items) n.items = tighten(n.items);
  return n;
}
