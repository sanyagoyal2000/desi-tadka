import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { CardSchema, type Card } from "./schema";
import { DATA_DIR } from "./paths";

// Saved cards live in data/cards.json on the laptop (spec.md > Card Store).
const FILE = path.join(DATA_DIR, "cards.json");

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
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  await writeFile(tmp, JSON.stringify([saved, ...others], null, 2));
  await rename(tmp, FILE); // swap in whole file so a crash never leaves half-written JSON
  return saved;
}
