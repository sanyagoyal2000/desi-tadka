"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, CheckCircle, ForkKnife } from "@phosphor-icons/react/dist/ssr";
import type { Card, MealEntry } from "@/lib/schema";
import { kcalPerRound, roundMinutes } from "@/lib/fitness";
import { todayISO } from "@/lib/plan";
import { postEntry } from "@/lib/todayClient";

// The "make it real" button on a saved card: start the camera coach, or log the dish you cooked.
export default function DoItNow({ card, weightKg }: { card: Card; weightKg: number }) {
  const [logged, setLogged] = useState(false);
  const [busy, setBusy] = useState(false);

  if (card.kind === "workout") {
    const minutes = Math.max(1, Math.round(roundMinutes(card) * card.rounds));
    return (
      <Link
        href={`/cards/${card.id}/coach`}
        className="flex items-center gap-3 rounded-3xl bg-volt p-4 text-white shadow-[0_8px_30px_rgba(110,52,255,0.45)] focus-visible:outline-2 focus-visible:outline-electric"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/20">
          <Camera aria-hidden="true" size={26} weight="fill" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-xl font-bold leading-tight">Do it with the camera coach</span>
          <span className="block text-sm text-white/80">
            Counts your reps out loud · ~{minutes} min · ~{kcalPerRound(card, weightKg) * card.rounds} kcal
          </span>
        </span>
      </Link>
    );
  }

  async function ate() {
    if (card.kind !== "recipe") return;
    setBusy(true);
    const entry: MealEntry = {
      kind: "meal",
      id: `meal-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      at: new Date().toISOString(),
      title: card.title,
      photo: card.image,
      cardId: card.id,
      items: [{ name: card.title, portion: "1 serving", count: 1, calories: card.calories, proteinGrams: card.proteinGrams }],
    };
    setLogged(await postEntry(todayISO(), entry));
    setBusy(false);
  }

  return logged ? (
    <Link href="/today" className="flex items-center justify-center gap-2 rounded-3xl bg-aqua p-4 font-display text-lg font-bold text-white">
      <CheckCircle aria-hidden="true" size={24} weight="fill" /> Logged to Today. See your rings →
    </Link>
  ) : (
    <button
      type="button"
      onClick={ate}
      disabled={busy}
      className="flex items-center gap-3 rounded-3xl bg-aqua p-4 text-left text-white disabled:opacity-60"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/20">
        <ForkKnife aria-hidden="true" size={26} weight="fill" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-xl font-bold leading-tight">I cooked this!</span>
        <span className="block text-sm text-white/80">
          Log 1 serving to Today · {card.calories} kcal · {card.proteinGrams} g protein
        </span>
      </span>
    </button>
  );
}
