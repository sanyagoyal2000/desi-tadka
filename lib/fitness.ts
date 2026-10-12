import type { Card, Exercise, FoodItem, Goals, LogEntry, RecipeCard, WorkoutCard } from "./schema";

// Pure numbers shared by the server and the browser: meal totals, workout burn estimates,
// "burn it back" equivalents and the protein-gap recipe pick. All values are estimates.

export function mealTotals(items: FoodItem[]) {
  return items.reduce(
    (t, i) => ({ calories: t.calories + i.calories * i.count, proteinGrams: t.proteinGrams + i.proteinGrams * i.count }),
    { calories: 0, proteinGrams: 0 },
  );
}

export function dayTotals(entries: LogEntry[]) {
  let eaten = 0;
  let protein = 0;
  let burned = 0;
  for (const e of entries) {
    if (e.kind === "meal") {
      const t = mealTotals(e.items);
      eaten += t.calories;
      protein += t.proteinGrams;
    } else burned += e.calories;
  }
  return { eaten: Math.round(eaten), protein: Math.round(protein), burned: Math.round(burned) };
}

// "12 reps" ≈ 3 s a rep, "10 each side" counts both sides, "30 sec" / "1 min" are timed.
export function parseReps(reps: string): { count: number; seconds: number; timed: boolean } {
  const s = reps.toLowerCase();
  const n = Number(s.match(/\d+(\.\d+)?/)?.[0] ?? 0);
  if (/\bmin/.test(s)) return { count: 0, seconds: Math.max(10, n * 60), timed: true };
  if (/\b(s|sec|secs|second|seconds)\b|\d\s*s\b/.test(s)) return { count: 0, seconds: Math.max(5, n), timed: true };
  const sides = /each|per side|\/side|per leg|each leg|each arm/.test(s) ? 2 : 1;
  const count = n > 0 ? Math.round(n * sides) : 10;
  return { count, seconds: count * 3, timed: false };
}

const REST_SECONDS = 15;
// Bodyweight circuits sit around MET 8; kcal/min = MET × 3.5 × kg / 200.
const kcalPerMinute = (met: number, kg: number) => (met * 3.5 * kg) / 200;

export function exerciseSeconds(ex: Pick<Exercise, "reps">) {
  return parseReps(ex.reps).seconds;
}

export function roundMinutes(card: WorkoutCard) {
  return card.exercises.reduce((sum, ex) => sum + exerciseSeconds(ex) + REST_SECONDS, 0) / 60;
}

export function kcalPerRound(card: WorkoutCard, weightKg: number) {
  return Math.max(1, Math.round(roundMinutes(card) * kcalPerMinute(8, weightKg)));
}

export function kcalForMinutes(minutes: number, weightKg: number) {
  return Math.round(minutes * kcalPerMinute(8, weightKg));
}

export type BurnBack = { card: WorkoutCard; rounds: number; minutes: number } | { walkMinutes: number };

// Turns food calories into rounds of one of the user's own saved workouts, or brisk-walk minutes when
// nothing is saved yet. A favorite wins if it's close to its usual round count; otherwise the workout whose
// rounds needed are closest to the rounds it normally has (so a tiny arm circuit doesn't say "27 rounds").
export function burnItBack(kcal: number, cards: Card[], weightKg: number): BurnBack {
  const workouts = cards.filter((c): c is WorkoutCard => c.kind === "workout" && c.exercises.length > 0);
  const misfit = (w: WorkoutCard) => Math.abs(Math.log(kcal / kcalPerRound(w, weightKg) / Math.max(1, w.rounds)));
  const byFit = [...workouts].sort((a, b) => misfit(a) - misfit(b));
  const fav = workouts.find((w) => w.favorite && misfit(w) < Math.log(2));
  const pick = fav ?? byFit[0];
  if (!pick) return { walkMinutes: Math.max(1, Math.round(kcal / kcalPerMinute(4.3, weightKg))) };
  const rounds = Math.max(0.5, Math.round((kcal / kcalPerRound(pick, weightKg)) * 2) / 2);
  return { card: pick, rounds, minutes: Math.round(rounds * roundMinutes(pick)) };
}

// The saved recipe that best fills today's protein gap without blowing the calories left.
export function closeTheGap(proteinLeft: number, caloriesLeft: number, cards: Card[]): RecipeCard | null {
  if (proteinLeft < 5) return null;
  const recipes = cards.filter((c): c is RecipeCard => c.kind === "recipe" && c.proteinGrams > 0);
  const fits = recipes.filter((r) => r.calories <= Math.max(caloriesLeft, 250));
  const pool = fits.length ? fits : recipes;
  if (!pool.length) return null;
  // Closest to covering the gap, preferring more protein per calorie.
  const score = (r: RecipeCard) => Math.abs(proteinLeft - r.proteinGrams) - (r.proteinGrams / Math.max(r.calories, 1)) * 100;
  return [...pool].sort((a, b) => score(a) - score(b))[0];
}

export function ringsFor(goals: Goals, totals: ReturnType<typeof dayTotals>) {
  const budget = goals.calories + totals.burned; // workouts earn calories back
  return {
    caloriesLeft: budget - totals.eaten,
    proteinLeft: goals.proteinGrams - totals.protein,
    caloriePct: Math.min(1, totals.eaten / Math.max(budget, 1)),
    proteinPct: Math.min(1, totals.protein / Math.max(goals.proteinGrams, 1)),
    burnPct: Math.min(1, totals.burned / 400), // 400 kcal of movement fills the third ring
    budget,
  };
}
