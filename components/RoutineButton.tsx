"use client";

import { useEffect, useState } from "react";
import { Check, Plus } from "@phosphor-icons/react/dist/ssr";
import type { Exercise } from "@/lib/schema";
import { forgetRoutine, loadRoutine, sameMove } from "@/lib/routineClient";

// "+ Routine" on one exercise of a saved workout: collects it into My routine on Home.
export default function RoutineButton({ exercise, cardId, cardTitle }: { exercise: Exercise; cardId: string; cardTitle: string }) {
  const [savedId, setSavedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadRoutine().then((items) => setSavedId(items.find((i) => i.cardId === cardId && sameMove(i.name, exercise.name))?.id ?? null));
  }, [cardId, exercise.name]);

  async function toggle() {
    setBusy(true);
    try {
      if (savedId) {
        const res = await fetch(`/api/routine?${new URLSearchParams({ id: savedId })}`, { method: "DELETE" });
        if (res.ok) setSavedId(null);
      } else {
        const res = await fetch("/api/routine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item: { name: exercise.name, reps: exercise.reps, image: exercise.image, cardId, cardTitle } }),
        });
        if (res.ok) setSavedId((await res.json()).item.id);
      }
      forgetRoutine();
    } finally {
      setBusy(false);
    }
  }

  const on = Boolean(savedId);
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      aria-label={on ? `Remove ${exercise.name} from my routine` : `Add ${exercise.name} to my routine`}
      className={`flex h-10 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-electric disabled:opacity-50 ${
        on ? "bg-aqua text-white" : "bg-electric-soft text-electric"
      }`}
    >
      {on ? <Check aria-hidden="true" size={14} weight="bold" /> : <Plus aria-hidden="true" size={14} weight="bold" />}
      {on ? "In routine" : "Routine"}
    </button>
  );
}
