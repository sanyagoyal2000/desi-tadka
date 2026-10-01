"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LinkInput from "@/components/LinkInput";
import SavedList from "@/components/SavedList";
import RoutineSection from "@/components/RoutineSection";
import type { Card } from "@/lib/schema";
import { clearDraft, saveDraft } from "@/lib/draft";
import { streamExtract, type ExtractStep } from "@/lib/progress";
import { FILTERS, matches, sortCards, type Filter } from "@/lib/cardFilters";
import { Barbell, Leaf, MagnifyingGlass, Timer } from "@phosphor-icons/react/dist/ssr";

const FILTER_ICONS = { protein: Barbell, veg: Leaf, quick: Timer } as const;

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<ExtractStep | null>(null);
  const [mode, setMode] = useState<"reel" | "idea">("reel");
  const [error, setError] = useState<string | null>(null);
  const [showCaptionFallback, setShowCaptionFallback] = useState(false);

  const [configured, setConfigured] = useState(true);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Set<Filter>>(new Set());

  useEffect(() => {
    clearDraft();
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => setConfigured(Boolean(s.configured)))
      .catch(() => {});
    fetch("/api/cards")
      .then((r) => r.json())
      .then((d) => setCards(d.cards ?? []))
      .catch(() => setCards([]));

    // Shared from Instagram via the iPhone shortcut: /?url=<reel link> converts it straight away.
    const shared = new URLSearchParams(window.location.search).get("url");
    const reel = shared?.match(/https?:\/\/\S+/)?.[0];
    if (reel) {
      window.history.replaceState(null, "", "/");
      setTimeout(() => extract({ url: reel }));
    }
    // extract only reads setters, so running this once on load is enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function extract(payload: { url?: string; caption?: string; idea?: string }) {
    setBusy(true);
    setStep(null);
    setMode(payload.idea ? "idea" : "reel");
    setError(null);
    try {
      const result = await streamExtract(payload, setStep);
      if (result.type === "error") {
        setError(result.error);
        if (result.inaccessible) setShowCaptionFallback(true);
        return;
      }
      if (result.type === "done") {
        saveDraft(result.data);
        router.push("/convert");
      }
    } catch {
      setError("Couldn't reach DesiTadka. Is the dev server running?");
    } finally {
      setBusy(false);
    }
  }

  async function toggleFavorite(card: Card) {
    const favorite = !card.favorite;
    setCards((cs) => cs?.map((c) => (c.id === card.id ? { ...c, favorite } : c)) ?? cs);
    const res = await fetch(`/api/cards/${card.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ favorite }) }).catch(() => null);
    if (!res?.ok) setCards((cs) => cs?.map((c) => (c.id === card.id ? { ...c, favorite: !favorite } : c)) ?? cs);
  }

  async function remove(card: Card) {
    const before = cards;
    setCards((cs) => cs?.filter((c) => c.id !== card.id) ?? cs);
    const res = await fetch(`/api/cards/${card.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setCards(before);
      setError(`Couldn't delete "${card.title}".`);
    }
  }

  function toggleFilter(f: Filter) {
    setFilters((prev) => {
      const next = new Set(prev);
      if (!next.delete(f)) next.add(f);
      return next;
    });
  }

  const filtering = query.trim() !== "" || filters.size > 0;
  const visible = cards && sortCards(cards.filter((c) => matches(c, query, filters)));

  return (
    <main className="flex flex-col gap-6">
      {!configured && (
        <p className="rounded-2xl bg-chili px-4 py-3 text-sm font-semibold text-white">Add an OpenAI key or Codex path in .env.local.</p>
      )}
      <LinkInput
        busy={busy}
        step={step}
        mode={mode}
        error={error}
        showCaptionFallback={showCaptionFallback}
        onSubmitLink={(url) => extract({ url })}
        onSubmitIdea={(idea) => extract({ idea })}
        onSubmitCaption={(caption) => extract({ caption })}
      />

      {cards && cards.length > 0 && (
        <div className="flex flex-col gap-2">
          <label htmlFor="search" className="sr-only">
            Search your cards
          </label>
          <div className="relative">
          <MagnifyingGlass aria-hidden="true" size={18} weight="bold" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ingredient or exercise"
            className="w-full rounded-2xl border-2 border-transparent bg-surface py-3 pl-11 pr-4 text-base shadow-[0_2px_8px_rgba(42,26,16,0.06)] outline-none focus:border-turmeric"
          />
          </div>
          <div role="group" aria-label="Recipe filters" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const on = filters.has(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleFilter(f.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-turmeric ${
                    on ? "bg-chili text-white" : "bg-surface text-ink/70 hover:text-ink"
                  }`}
                >
                  {(() => {
                    const Icon = FILTER_ICONS[f.id];
                    return <Icon aria-hidden="true" size={16} weight="bold" />;
                  })()}
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <SavedList
        key={`${query}|${[...filters].join()}`}
        cards={visible}
        filtering={filtering}
        onToggleFavorite={toggleFavorite}
        onDelete={remove}
      />

      <RoutineSection />
    </main>
  );
}
