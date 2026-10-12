"use client";

import { useEffect, useState } from "react";
import type { Card } from "@/lib/schema";

type Props = {
  card: Card;
  item: string;
  quantity?: string; // recipes only: lets the user change the amount
  preloaded?: string[]; // from the card-wide prefetch, when it has arrived
  preloading: boolean; // card-wide prefetch still running
  onApply: (replacement: string) => void;
  onChangeQuantity?: (quantity: string) => void;
  onClose: () => void;
};

// Bottom sheet opened from a ↺ icon: change the amount, AI suggestions, or "type your own".
export default function SwapSheet({ card, item, quantity, preloaded, preloading, onApply, onChangeQuantity, onClose }: Props) {
  const [fetched, setFetched] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [hint, setHint] = useState("");
  const [amount, setAmount] = useState(quantity ?? "");
  const isWorkout = card.kind === "workout";
  const needOwnFetch = !preloaded && !preloading;

  async function load(withHint?: string) {
    setFetched(null);
    setError(null);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card, item, hint: withHint }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFetched(data.suggestions);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't get suggestions.");
      setFetched([]);
    }
  }

  // Only ask for this one item if the card-wide prefetch didn't cover it.
  useEffect(() => {
    if (!needOwnFetch) return;
    let cancelled = false;
    fetch("/api/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card, item }) })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Couldn't get suggestions.");
          setFetched([]);
        } else setFetched(data.suggestions);
      })
      .catch(() => !cancelled && (setError("Couldn't get suggestions."), setFetched([])));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, needOwnFetch]);

  const suggestions = fetched ?? preloaded ?? null;
  const amountChanged = amount.trim() !== "" && amount.trim() !== (quantity ?? "").trim();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-surface p-5 pb-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/15" />
        <p className="text-sm font-medium text-ink/60">{isWorkout ? "Swap" : "Change or swap"}</p>
        <h3 className="font-display text-2xl font-extrabold">{item}</h3>

        {onChangeQuantity && (
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (amountChanged) onChangeQuantity(amount.trim());
            }}
          >
            <label htmlFor="amount" className="text-sm font-semibold">
              Amount
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 150 g, 2 tbsp"
                className="min-w-0 flex-1 rounded-2xl bg-canvas px-4 py-3 outline-none focus:ring-2 focus:ring-electric"
              />
              <button type="submit" disabled={!amountChanged} className="rounded-2xl bg-ink/80 px-4 font-semibold text-white disabled:opacity-40">
                Update
              </button>
            </div>
          </form>
        )}

        <p className="mt-5 text-sm font-semibold">{isWorkout ? "Try instead" : "Desi swaps"}</p>
        {suggestions === null ? (
          <div role="status" className="mt-2">
            <p className="flex items-center gap-2 text-sm text-ink/60">
              <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-electric border-t-transparent" />
              Finding {isWorkout ? "alternatives" : "desi swaps"} for {item}… usually about 10 seconds.
            </p>
            <div aria-hidden="true" className="mt-2 flex flex-wrap gap-2">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-11 w-28 animate-pulse rounded-full bg-electric-soft" />
              ))}
            </div>
            <p className="mt-2 text-xs text-ink/50">Know what you want? Type it below — no need to wait.</p>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onApply(s)}
                className="rounded-full border-2 border-electric bg-electric-soft px-4 py-2 font-semibold text-ink active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {error && <p className="mt-2 text-sm font-semibold text-blaze">{error}</p>}

        {isWorkout && (
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (hint.trim()) load(hint.trim());
            }}
          >
            <input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="Focus on… (e.g. knee friendly, no equipment)"
              className="min-w-0 flex-1 rounded-2xl bg-canvas px-4 py-3 outline-none focus:ring-2 focus:ring-electric"
            />
            <button type="submit" className="rounded-2xl bg-ink/80 px-4 font-semibold text-white">
              Ask
            </button>
          </form>
        )}

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (custom.trim()) onApply(custom.trim());
          }}
        >
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Or type your own"
            className="min-w-0 flex-1 rounded-2xl bg-canvas px-4 py-3 outline-none focus:ring-2 focus:ring-electric"
          />
          <button type="submit" disabled={!custom.trim()} className="rounded-2xl bg-volt px-4 font-display font-bold text-white disabled:opacity-40">
            Swap
          </button>
        </form>
      </div>
    </div>
  );
}
