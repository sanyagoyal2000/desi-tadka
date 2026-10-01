import type { Card, RecipeCard } from "./schema";

export type Filter = "protein" | "veg" | "quick";

export const FILTERS: { id: Filter; label: string }[] = [
  { id: "protein", label: "High protein" },
  { id: "veg", label: "Vegetarian" },
  { id: "quick", label: "Under 20 min" },
];

const HIGH_PROTEIN_GRAMS = 25;
const QUICK_MINUTES = 20;
const NON_VEG = /\b(chicken|mutton|lamb|goat|beef|pork|bacon|ham|turkey|meat|keema|kheema|fish|tuna|salmon|cod|prawns?|shrimps?|crab|lobster|squid|eggs?|egg whites?|anchov(y|ies)|sausages?|pepperoni|gelatine?)\b/i;

export const isVegetarian = (c: RecipeCard) => !c.ingredients.some((i) => NON_VEG.test(i.name));

// Filters only apply to recipes; a workout is hidden only by the search text.
export function matches(card: Card, query: string, filters: Set<Filter>): boolean {
  const q = query.trim().toLowerCase();
  if (q) {
    const haystack = [card.title, ...(card.kind === "recipe" ? card.ingredients.map((i) => i.name) : card.exercises.map((e) => e.name))].join(" ").toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (card.kind !== "recipe") return true;
  if (filters.has("protein") && card.proteinGrams < HIGH_PROTEIN_GRAMS) return false;
  if (filters.has("veg") && !isVegetarian(card)) return false;
  if (filters.has("quick") && card.prepTimeMinutes > QUICK_MINUTES) return false;
  return true;
}

// Favourites first, then newest saved.
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
}
