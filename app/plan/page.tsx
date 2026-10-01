/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DAYS, type Card, type Day, type Plan } from "@/lib/schema";
import { DAY_LABELS } from "@/lib/plan";
import { sortCards } from "@/lib/cardFilters";

type DragData = { id: string; from?: { day: Day; index: number } };

// Weekly planner: drag (or tap-then-tap) saved cards onto days.
export default function PlanPage() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [overDay, setOverDay] = useState<Day | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([fetch("/api/cards").then((r) => r.json()), fetch("/api/plan").then((r) => r.json())])
      .then(([c, p]) => {
        setCards(sortCards(c.cards ?? []));
        setPlan(p.plan);
      })
      .catch(() => setError("Couldn't load your plan."));
  }, []);

  const byId = useMemo(() => new Map((cards ?? []).map((c) => [c.id, c])), [cards]);

  async function save(next: Plan) {
    const prev = plan;
    setPlan(next);
    const res = await fetch("/api/plan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: next }) }).catch(() => null);
    if (!res?.ok) {
      setPlan(prev);
      setError("Couldn't save your plan.");
    }
  }

  function drop(day: Day, data: DragData) {
    if (!plan) return;
    const days = { ...plan.days };
    if (data.from) {
      if (data.from.day === day) return;
      days[data.from.day] = days[data.from.day].filter((_, i) => i !== data.from!.index);
    }
    days[day] = [...days[day], data.id];
    save({ days });
  }

  function removeAt(day: Day, index: number) {
    if (!plan) return;
    save({ days: { ...plan.days, [day]: plan.days[day].filter((_, i) => i !== index) } });
  }

  function clearWeek() {
    save({ days: Object.fromEntries(DAYS.map((d) => [d, []])) as unknown as Plan["days"] });
  }

  const planned = plan ? DAYS.flatMap((d) => plan.days[d].map((id) => byId.get(id)).filter((c): c is Card => Boolean(c))) : [];

  if (cards === null || plan === null) {
    return (
      <main className="flex flex-col gap-3">
        {error ? <p className="font-semibold text-chili">{error}</p> : [0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-3xl bg-surface/60" />)}
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">My week</h1>
        <p className="text-sm text-ink/60">Drag a card onto a day, or tap a card and then tap a day.</p>
      </div>
      {error && <p className="rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-chili">{error}</p>}

      {cards.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-turmeric/50 p-6 text-center text-sm text-ink/60">
          Save a recipe or workout first, then plan it here. <Link href="/" className="font-semibold text-chili underline">Go home</Link>
        </div>
      ) : (
        <section aria-label="Your cards">
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
            {cards.map((c) => (
              <li key={c.id} className="shrink-0">
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("application/json", JSON.stringify({ id: c.id } satisfies DragData))}
                  onClick={() => setSelected((s) => (s === c.id ? null : c.id))}
                  aria-pressed={selected === c.id}
                  className={`flex w-36 cursor-grab items-center gap-2 rounded-2xl bg-surface p-1.5 pr-2 text-left shadow-[0_2px_8px_rgba(42,26,16,0.06)] transition focus-visible:outline-2 focus-visible:outline-turmeric active:cursor-grabbing ${
                    selected === c.id ? "ring-2 ring-chili" : ""
                  }`}
                >
                  <Thumb card={c} className="size-10" />
                  <span className="line-clamp-2 text-xs font-bold leading-tight">{c.title}</span>
                </button>
              </li>
            ))}
          </ul>
          {selected && <p className="mt-1 text-center text-xs font-semibold text-chili">Now tap a day to add “{byId.get(selected)?.title}”.</p>}
        </section>
      )}

      <ol className="flex flex-col gap-2">
        {DAYS.map((d) => (
          <li
            key={d}
            onDragOver={(e) => {
              e.preventDefault();
              setOverDay(d);
            }}
            onDragLeave={() => setOverDay((o) => (o === d ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOverDay(null);
              try {
                drop(d, JSON.parse(e.dataTransfer.getData("application/json")));
              } catch {}
            }}
            className={`rounded-3xl bg-surface p-3 shadow-[0_2px_8px_rgba(42,26,16,0.06)] transition ${overDay === d ? "ring-2 ring-turmeric" : ""}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{DAY_LABELS[d].long}</h2>
              {selected && (
                <button
                  type="button"
                  onClick={() => {
                    drop(d, { id: selected });
                    setSelected(null);
                  }}
                  className="rounded-full bg-chili px-3 py-1 text-xs font-bold text-white"
                >
                  + Add here
                </button>
              )}
            </div>
            {plan.days[d].length === 0 ? (
              <p className="mt-1 text-xs text-ink/40">Rest day — or drop something here.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {plan.days[d].map((id, i) => {
                  const c = byId.get(id);
                  if (!c) return null;
                  return (
                    <li
                      key={`${id}-${i}`}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("application/json", JSON.stringify({ id, from: { day: d, index: i } } satisfies DragData))}
                      className="flex cursor-grab items-center gap-2 rounded-2xl bg-cream p-1.5 active:cursor-grabbing"
                    >
                      <Thumb card={c} className="size-9" />
                      <Link href={`/cards/${c.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">
                        <span className={c.kind === "recipe" ? "text-chili" : "text-leaf"}>{c.kind === "recipe" ? "🍛" : "💪"}</span> {c.title}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeAt(d, i)}
                        aria-label={`Remove ${c.title} from ${DAY_LABELS[d].long}`}
                        className="grid size-8 shrink-0 place-items-center rounded-full text-ink/40 hover:bg-surface hover:text-chili"
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ol>

      {planned.length > 0 && (
        <button type="button" onClick={clearWeek} className="text-sm font-semibold text-ink/50 hover:text-chili">
          Clear the week
        </button>
      )}
    </main>
  );
}

function Thumb({ card, className }: { card: Card; className: string }) {
  const image = card.kind === "recipe" ? card.image : card.exercises[0]?.image;
  return (
    <div className={`${className} shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-turmeric to-chili`}>
      {image ? <img src={image} alt="" draggable={false} className="size-full object-cover" /> : null}
    </div>
  );
}
