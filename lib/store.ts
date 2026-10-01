import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { CardSchema, PlanSchema, emptyPlan, type Card, type Plan } from "./schema";
import { todayISO, weekDates, weekStart } from "./plan";
import { DATA_DIR, MEDIA_DIR } from "./paths";

// Saved cards live in data/cards.json on the laptop (spec.md > Card Store).
const FILE = path.join(DATA_DIR, "cards.json");
const PLAN_FILE = path.join(DATA_DIR, "plan.json");

async function writeJSON(file: string, value: unknown) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2));
  await rename(tmp, file); // swap in whole file so a crash never leaves half-written JSON
}

export async function listCards(): Promise<Card[]> {
  try {
    const parsed = z.array(CardSchema).safeParse(JSON.parse(await readFile(FILE, "utf8")));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function getCard(id: string): Promise<Card | null> {
  return (await listCards()).find((c) => c.id === id) ?? null;
}

export async function saveCard(card: Card): Promise<Card> {
  const saved = { ...card, savedAt: new Date().toISOString() };
  const others = (await listCards()).filter((c) => c.id !== card.id);
  await writeJSON(FILE, [saved, ...others]);
  return saved;
}

export async function setFavorite(id: string, favorite: boolean): Promise<Card | null> {
  const cards = await listCards();
  const card = cards.find((c) => c.id === id);
  if (!card) return null;
  card.favorite = favorite;
  await writeJSON(FILE, cards);
  return card;
}

// Removes the card, its media folder, and any plan slots that pointed at it.
export async function deleteCard(id: string): Promise<boolean> {
  const cards = await listCards();
  const rest = cards.filter((c) => c.id !== id);
  if (rest.length === cards.length) return false;
  await writeJSON(FILE, rest);
  if (/^[\w-]+$/.test(id)) await rm(path.join(MEDIA_DIR, id), { recursive: true, force: true });
  const plan = await getPlan();
  await savePlan({ days: Object.fromEntries(Object.entries(plan.days).map(([d, ids]) => [d, ids.filter((x) => x !== id)])) });
  return true;
}

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export async function getPlan(): Promise<Plan> {
  try {
    const raw = JSON.parse(await readFile(PLAN_FILE, "utf8"));
    // Older plans were one repeating Mon–Sun week; place them on this week's dates.
    if (raw?.days && WEEKDAYS.some((d) => d in raw.days)) {
      const dates = weekDates(weekStart(todayISO()));
      raw.days = Object.fromEntries(WEEKDAYS.map((d, i) => [dates[i], raw.days[d] ?? []]));
    }
    const parsed = PlanSchema.safeParse(raw);
    return parsed.success ? parsed.data : emptyPlan();
  } catch {
    return emptyPlan();
  }
}

// Empty days are dropped so the file only holds dates with something planned.
export async function savePlan(plan: Plan): Promise<Plan> {
  const clean: Plan = { days: Object.fromEntries(Object.entries(plan.days).filter(([, ids]) => ids.length > 0)) };
  await writeJSON(PLAN_FILE, clean);
  return clean;
}
