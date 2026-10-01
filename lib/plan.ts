import type { Day, RecipeCard } from "./schema";

export const DAY_LABELS: Record<Day, { short: string; long: string }> = {
  mon: { short: "Mon", long: "Monday" },
  tue: { short: "Tue", long: "Tuesday" },
  wed: { short: "Wed", long: "Wednesday" },
  thu: { short: "Thu", long: "Thursday" },
  fri: { short: "Fri", long: "Friday" },
  sat: { short: "Sat", long: "Saturday" },
  sun: { short: "Sun", long: "Sunday" },
};

export type ShoppingItem = { key: string; name: string; quantity: string; recipes: string[] };

const AMOUNT = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]*)$/;

// One line per ingredient across every planned recipe (a recipe planned twice counts twice).
// Quantities with the same unit are added up ("200 g" + "100 g" → "300 g"); others are listed.
export function shoppingList(recipes: RecipeCard[]): ShoppingItem[] {
  const groups = new Map<string, { name: string; quantities: string[]; recipes: Set<string> }>();
  for (const r of recipes) {
    for (const ing of r.ingredients) {
      const key = ing.name.trim().toLowerCase();
      const g = groups.get(key) ?? { name: ing.name.trim(), quantities: [], recipes: new Set() };
      if (ing.quantity.trim() && !/^not specified$/i.test(ing.quantity.trim())) g.quantities.push(ing.quantity.trim());
      g.recipes.add(r.title);
      groups.set(key, g);
    }
  }
  return [...groups.entries()]
    .map(([key, g]) => ({ key, name: g.name, quantity: combine(g.quantities), recipes: [...g.recipes] }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function combine(quantities: string[]): string {
  const parsed = quantities.map((q) => q.match(AMOUNT));
  const unit = parsed[0]?.[2].toLowerCase();
  if (parsed.length > 1 && parsed.every((m) => m && m[2].toLowerCase() === unit)) {
    const total = parsed.reduce((sum, m) => sum + Number(m![1]), 0);
    return `${Math.round(total * 100) / 100}${unit ? ` ${parsed[0]![2]}` : ""}`;
  }
  return quantities.join(" + ");
}
