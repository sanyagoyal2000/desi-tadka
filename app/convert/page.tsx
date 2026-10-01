"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearDraft, useDraft } from "@/lib/draft";
import { MAX_WORKOUT_SWAPS, type Card } from "@/lib/schema";
import RecipeCard from "@/components/RecipeCard";
import WorkoutCard from "@/components/WorkoutCard";
import SwapSheet from "@/components/SwapSheet";

export default function ConvertPage() {
  const router = useRouter();
  const draft = useDraft<{ card: Card }>();

  useEffect(() => {
    if (draft === null) router.replace("/");
  }, [draft, router]);

  if (!draft) return null;
  return <Editor initial={draft.card} />;
}

// Holds the in-progress card in React state; it's discarded unless saved.
function Editor({ initial }: { initial: Card }) {
  const router = useRouter();
  const [card, setCard] = useState<Card>(initial);
  const [saving, setSaving] = useState(false);
  const [sheetIndex, setSheetIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | "veg" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = card.kind === "recipe" ? card.ingredients : card.exercises;

  async function apply(payload: Record<string, unknown>, busyKey: number | "veg") {
    setBusy(busyKey);
    setError(null);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCard(data.card);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/cards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card }) });
      if (!res.ok) throw new Error((await res.json()).error);
      clearDraft();
      router.push("/");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't save.");
      setSaving(false);
    }
  }

  function onSwap(index: number) {
    if (card.kind === "workout" && card.swapCount >= MAX_WORKOUT_SWAPS) {
      setError(`You've used all ${MAX_WORKOUT_SWAPS} swaps — this keeps it the original plan.`);
      return;
    }
    setSheetIndex(index);
  }

  return (
    <main className="flex flex-col gap-4">
      <section className="rounded-3xl bg-chili p-4 text-white">
        {card.kind === "recipe" ? (
          <>
            <p className="font-display text-xl font-bold">Add some tadka? 🌶️</p>
            <p className="text-sm text-white/85">Tap ↺ on any ingredient for a desi swap, or convert the whole thing.</p>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => apply({ action: "vegetarian" }, "veg")}
              className="mt-3 w-full rounded-2xl bg-white py-3 font-display text-lg font-bold text-chili disabled:opacity-60"
            >
              {busy === "veg" ? "Adding tadka…" : "🥬 Make it vegetarian"}
            </button>
          </>
        ) : (
          <WorkoutPrompt swapCount={card.swapCount} />
        )}
      </section>

      {error && <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-chili">{error}</p>}
      {typeof busy === "number" && <p className="animate-pulse text-center text-sm font-semibold text-turmeric">Adding tadka… rewriting the {card.kind}</p>}

      {card.kind === "recipe" ? (
        <RecipeCard card={card} onSwap={onSwap} busyIndex={typeof busy === "number" ? busy : null} />
      ) : (
        <WorkoutCard card={card} onSwap={onSwap} busyIndex={typeof busy === "number" ? busy : null} />
      )}

      <div className="sticky bottom-4 z-40 flex gap-2">
        <button
          type="button"
          onClick={() => {
            clearDraft();
            router.push("/");
          }}
          className="rounded-2xl bg-white px-5 py-4 font-semibold text-ink/70 shadow-lg"
        >
          Discard
        </button>
        <button
          type="button"
          disabled={saving || busy !== null}
          onClick={save}
          className="flex-1 rounded-2xl bg-leaf py-4 font-display text-xl font-bold text-white shadow-lg disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save to my cards"}
        </button>
      </div>

      {sheetIndex !== null && (
        <SwapSheet
          card={card}
          item={items[sheetIndex].name}
          onClose={() => setSheetIndex(null)}
          onApply={(to) => {
            const index = sheetIndex;
            setSheetIndex(null);
            apply({ action: "swap", index, to }, index);
          }}
        />
      )}
    </main>
  );
}

function WorkoutPrompt({ swapCount }: { swapCount: number }) {
  return (
    <>
      <p className="font-display text-xl font-bold">Want to change anything? 💪</p>
      <p className="text-sm text-white/85">Tap ↺ to swap an exercise, and tell me what to focus on. {MAX_WORKOUT_SWAPS - swapCount} of {MAX_WORKOUT_SWAPS} swaps left.</p>
    </>
  );
}
