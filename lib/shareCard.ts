"use client";

import type { Card } from "./schema";

export function shareText(card: Card): string {
  if (card.kind === "recipe") {
    return [
      `🍛 ${card.title}`,
      `${card.proteinGrams}g protein · ${card.calories} cal · ${card.prepTimeMinutes} min`,
      "",
      "Ingredients:",
      ...card.ingredients.map((i) => `• ${i.quantity} ${i.name}`.replace(/\s+/g, " ")),
      "",
      "Made with DesiTadka 🌶️",
    ].join("\n");
  }
  return [
    `💪 ${card.title}`,
    `${card.rounds} rounds · ${card.exercises.length} exercises`,
    "",
    ...card.exercises.map((e) => `• ${e.name} — ${e.reps}`),
    "",
    "Made with DesiTadka 🌶️",
  ].join("\n");
}

const W = 1080;
const H = 1350;
const C = { base: "#08112b", ink: "#f2f0ff", volt: "#b49cff", electric: "#3a6cff", violet: "#6a2cff", magenta: "#b02cf0", aqua: "#43e8d0", muted: "#9aa3c7" };

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Draws a portrait share image (Instagram/WhatsApp friendly) of the card.
export async function shareImage(card: Card): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  await document.fonts?.ready;
  const display = getComputedStyle(document.body).getPropertyValue("--font-montserrat").trim() || "sans-serif";
  const sans = getComputedStyle(document.body).getPropertyValue("--font-inter").trim() || "sans-serif";

  ctx.fillStyle = C.base;
  ctx.fillRect(0, 0, W, H);

  // hero photo (cover-fit) or gradient
  const heroH = 560;
  const img = await loadImage(card.kind === "recipe" ? card.image : (card.exercises[0]?.image ?? ""));
  if (img) {
    const scale = Math.max(W / img.width, heroH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, heroH);
    ctx.clip();
    ctx.drawImage(img, (W - w) / 2, (heroH - h) / 2, w, h);
    ctx.restore();
  } else {
    const g = ctx.createLinearGradient(0, 0, W, heroH);
    g.addColorStop(0, C.electric);
    g.addColorStop(0.55, C.violet);
    g.addColorStop(1, C.magenta);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, heroH);
  }

  let y = heroH + 80;
  ctx.fillStyle = card.kind === "recipe" ? C.volt : C.aqua;
  ctx.font = `700 30px ${sans}`;
  ctx.fillText(card.kind === "recipe" ? "RECIPE" : "WORKOUT", 72, y);

  y += 72;
  ctx.fillStyle = C.ink;
  ctx.font = `900 64px ${display}`;
  for (const line of wrap(ctx, card.title.toUpperCase(), W - 144).slice(0, 2)) {
    ctx.fillText(line, 72, y);
    y += 74;
  }

  ctx.fillStyle = C.volt;
  ctx.font = `700 40px ${display}`;
  const stats =
    card.kind === "recipe"
      ? `${card.proteinGrams}g protein · ${card.calories} cal · ${card.prepTimeMinutes} min`
      : `${card.rounds} rounds · ${card.exercises.length} exercises`;
  ctx.fillText(stats, 72, y + 4);
  y += 70;

  ctx.fillStyle = C.ink;
  ctx.font = `400 34px ${sans}`;
  const items = card.kind === "recipe" ? card.ingredients.map((i) => `${i.quantity} ${i.name}`) : card.exercises.map((e) => `${e.name} — ${e.reps}`);
  const room = Math.floor((H - 120 - y) / 48);
  const shown = items.length > room ? [...items.slice(0, room - 1), `+ ${items.length - room + 1} more`] : items;
  for (const it of shown) {
    ctx.fillText(`•  ${truncate(ctx, it, W - 160)}`, 72, y);
    y += 48;
  }

  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, C.electric);
  bar.addColorStop(0.55, C.violet);
  bar.addColorStop(1, C.magenta);
  ctx.fillStyle = bar;
  ctx.fillRect(0, H - 90, W, 90);
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 40px ${display}`;
  ctx.fillText("DESITADKA", 72, H - 32);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function truncate(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}
