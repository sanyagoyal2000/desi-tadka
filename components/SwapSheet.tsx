"use client";

import { useEffect, useState } from "react";
import type { Card } from "@/lib/schema";

type Props = {
  card: Card;
  item: string;
  onApply: (replacement: string) => void;
  onClose: () => void;
};

// Bottom sheet opened from a ↺ icon: AI suggestions plus "type your own".
export default function SwapSheet({ card, item, onApply, onClose }: Props) {
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [hint, setHint] = useState("");
  const isWorkout = card.kind === "workout";

  async function load(withHint?: string) {
    setSuggestions(null);
    setError(null);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card, item, hint: withHint }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuggestions(data.suggestions);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't get suggestions.");
      setSuggestions([]);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card, item }) })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Couldn't get suggestions.");
          setSuggestions([]);
        } else setSuggestions(data.suggestions);
      })
      .catch(() => !cancelled && (setError("Couldn't get suggestions."), setSuggestions([])));
    return () => {
      cancelled = true;
    };
    // Only fetch once per opened item.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-surface p-5 pb-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/15" />
        <p className="text-sm font-medium text-ink/60">Swap</p>
        <h3 className="font-display text-2xl font-extrabold">{item}</h3>

        <p className="mt-4 text-sm font-semibold">{isWorkout ? "Try instead" : "Desi swaps"}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions === null &&
            [0, 1, 2].map((i) => <span key={i} className="h-11 w-28 animate-pulse rounded-full bg-turmeric-soft" />)}
          {suggestions?.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onApply(s)}
              className="rounded-full border-2 border-turmeric bg-turmeric-soft px-4 py-2 font-semibold text-ink active:scale-95"
            >
              {s}
            </button>
          ))}
        </div>
        {error && <p className="mt-2 text-sm font-semibold text-chili">{error}</p>}

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
              className="min-w-0 flex-1 rounded-2xl bg-cream px-4 py-3 outline-none focus:ring-2 focus:ring-turmeric"
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
            className="min-w-0 flex-1 rounded-2xl bg-cream px-4 py-3 outline-none focus:ring-2 focus:ring-turmeric"
          />
          <button type="submit" disabled={!custom.trim()} className="rounded-2xl bg-chili px-4 font-display font-bold text-white disabled:opacity-40">
            Swap
          </button>
        </form>
      </div>
    </div>
  );
}
