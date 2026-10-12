/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight, Fire, ForkKnife, Gear, Lightning, Play, Trash } from "@phosphor-icons/react/dist/ssr";
import Rings from "@/components/Rings";
import MealLogger from "@/components/MealLogger";
import type { Card, Goals, LogEntry, MealEntry } from "@/lib/schema";
import { burnItBack, closeTheGap, dayTotals, mealTotals, ringsFor } from "@/lib/fitness";
import { addDays, dayLabel, todayISO } from "@/lib/plan";
import { fetchDay, fetchGoals } from "@/lib/todayClient";

// Ring colours sit on the glowing violet card, so they're fixed rather than theme tokens.
const RING_EAT = "#ffffff";
const RING_PROTEIN = "#43e8d0";
const RING_BURN = "#ff6fae";

// Used when no saved recipe can close the protein gap.
const VEG_PROTEIN = ["1 katori soya chunks (~25 g)", "200 g paneer bhurji (~36 g)", "1 katori sprouts chaat (~14 g)", "1 glass sattu (~20 g)", "200 g hung curd (~20 g)"];

export default function Today() {
  const [date, setDate] = useState(todayISO);
  const [entries, setEntries] = useState<LogEntry[] | null>(null);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGoals().then(setGoals).catch(() => setError("Couldn't load your goals."));
    fetch("/api/cards")
      .then((r) => r.json())
      .then((d) => setCards(d.cards ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let live = true;
    fetchDay(date)
      .then((e) => live && setEntries(e))
      .catch(() => live && setError("Couldn't load this day."));
    return () => {
      live = false;
    };
  }, [date]);

  async function remove(entry: LogEntry) {
    setEntries((es) => es?.filter((e) => e.id !== entry.id) ?? es);
    const res = await fetch(`/api/log?${new URLSearchParams({ date, id: entry.id })}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) setEntries((es) => (es ? [...es, entry] : es));
  }

  const isToday = date === todayISO();
  const label = dayLabel(date);
  const totals = entries && dayTotals(entries);
  const r = goals && totals && ringsFor(goals, totals);
  const gapRecipe = r && closeTheGap(r.proteinLeft, r.caloriesLeft, cards);
  const workouts = cards.filter((c) => c.kind === "workout");

  return (
    <main className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => { setEntries(null); setDate((d) => addDays(d, -1)); }} aria-label="Previous day" className="grid size-10 place-items-center rounded-full bg-surface text-volt">
          <CaretLeft aria-hidden="true" size={18} weight="bold" />
        </button>
        <div className="text-center">
          <h1 className="font-display text-2xl font-extrabold leading-none">{isToday ? "Today" : label.long}</h1>
          <p className="mt-1 text-xs font-medium text-ink/60">{label.date}</p>
        </div>
        <button type="button" onClick={() => { setEntries(null); setDate((d) => addDays(d, 1)); }} disabled={isToday} aria-label="Next day" className="grid size-10 place-items-center rounded-full bg-surface text-volt disabled:opacity-30">
          <CaretRight aria-hidden="true" size={18} weight="bold" />
        </button>
      </div>

      {error && <p role="alert" className="rounded-2xl bg-blaze px-4 py-3 text-sm font-semibold text-white">{error}</p>}

      {!r || !totals || !goals ? (
        <div className="h-52 animate-pulse rounded-3xl bg-surface/60" />
      ) : (
        <section aria-label="Today's rings" className="glow-card rounded-[2rem] p-5">
          <div className="flex items-center gap-4">
            <Rings size={136} rings={[{ pct: r.caloriePct, color: RING_EAT }, { pct: r.proteinPct, color: RING_PROTEIN }, { pct: r.burnPct, color: RING_BURN }]} />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">{r.caloriesLeft < 0 ? "Over by" : "Left today"}</p>
              <p className="font-display text-6xl font-black leading-none tracking-tight tabular-nums">{Math.abs(r.caloriesLeft)}</p>
              <p className="mt-1 font-display text-sm font-bold uppercase tracking-widest text-white/80">kcal</p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-white/20 pt-4">
            <Stat color={RING_EAT} label="Eaten" value={totals.eaten} unit={`/ ${r.budget}`} />
            <Stat color={RING_PROTEIN} label="Protein" value={totals.protein} unit={`/ ${goals.proteinGrams} g`} />
            <Stat color={RING_BURN} label="Burned" value={totals.burned} unit="kcal" />
          </dl>
        </section>
      )}

      {r && isToday && r.proteinLeft >= 5 && (
        <section aria-label="Protein gap" className="rounded-3xl bg-aqua/10 p-4 ring-2 ring-aqua/30">
          <p className="text-sm font-bold text-aqua">You&apos;re {Math.round(r.proteinLeft)} g protein short today</p>
          {gapRecipe ? (
            <Link href={`/cards/${gapRecipe.id}`} className="mt-2 flex items-center gap-3 rounded-2xl bg-surface p-2 pr-3">
              {gapRecipe.image ? <img src={gapRecipe.image} alt="" className="size-14 shrink-0 rounded-xl object-cover" /> : <span className="grid size-14 place-items-center rounded-xl bg-electric-soft text-electric"><ForkKnife size={22} /></span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">Make {gapRecipe.title}</span>
                <span className="block text-xs text-ink/60">from your saved reels · {gapRecipe.proteinGrams} g protein · {gapRecipe.calories} kcal</span>
              </span>
              <CaretRight aria-hidden="true" size={16} weight="bold" className="text-aqua" />
            </Link>
          ) : (
            <p className="mt-1 text-sm text-ink/70">Easy veg fixes: {VEG_PROTEIN.slice(0, 3).join(" · ")}</p>
          )}
        </section>
      )}

      <MealLogger date={date} onLogged={(e) => setEntries((es) => [...(es ?? []), e])} />

      <section aria-labelledby="timeline-heading" className="flex flex-col gap-2">
        <h2 id="timeline-heading" className="font-display text-xl font-extrabold">
          {isToday ? "So far today" : "That day"}
        </h2>
        {entries === null ? (
          <div className="h-20 animate-pulse rounded-3xl bg-surface/60" />
        ) : entries.length === 0 ? (
          <p className="rounded-3xl border-2 border-dashed border-electric/50 px-6 py-6 text-center text-sm text-ink/60">
            Nothing logged yet. Snap your next plate, or{" "}
            {workouts[0] ? (
              <Link href={`/cards/${workouts[0].id}/coach`} className="font-semibold text-volt underline">
                start a workout
              </Link>
            ) : (
              "save a workout reel"
            )}
            .
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...entries].reverse().map((e) => (
              <li key={e.id} className="rounded-3xl bg-surface p-3 shadow-[0_2px_8px_rgba(24,12,80,0.06)]">
                {e.kind === "meal" ? (
                  <MealRow entry={e} cards={cards} weightKg={goals?.weightKg ?? 65} onDelete={() => remove(e)} />
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-electric-soft text-electric">
                      <Lightning aria-hidden="true" size={26} weight="fill" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{e.title}</p>
                      <p className="text-xs text-ink/60">
                        {time(e.at)} · {e.reps} reps · {Math.round(e.minutes)} min
                      </p>
                    </div>
                    <span className="font-display text-lg font-bold text-electric">−{e.calories}</span>
                    <DeleteButton label={e.title} onClick={() => remove(e)} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {goals && <GoalsEditor goals={goals} onSaved={setGoals} />}
    </main>
  );
}

function MealRow({ entry, cards, weightKg, onDelete }: { entry: MealEntry; cards: Card[]; weightKg: number; onDelete: () => void }) {
  const t = mealTotals(entry.items);
  const burn = burnItBack(t.calories, cards, weightKg);
  return (
    <>
      <div className="flex items-center gap-3">
        {entry.photo ? (
          <img src={entry.photo} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-electric-soft text-electric">
            <ForkKnife aria-hidden="true" size={24} weight="duotone" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{entry.title}</p>
          <p className="truncate text-xs text-ink/60">
            {time(entry.at)} · {entry.items.map((i) => `${i.count} ${i.name}`).join(", ")}
          </p>
        </div>
        <span className="text-right">
          <span className="block font-display text-lg font-bold leading-none text-volt">{Math.round(t.calories)}</span>
          <span className="text-[11px] font-semibold text-aqua">{Math.round(t.proteinGrams)} g</span>
        </span>
        <DeleteButton label={entry.title} onClick={onDelete} />
      </div>
      {"card" in burn ? (
        <Link href={`/cards/${burn.card.id}/coach`} className="mt-2 flex items-center gap-2 rounded-2xl bg-electric-soft px-3 py-2 text-sm">
          <Fire aria-hidden="true" size={18} weight="fill" className="shrink-0 text-blaze" />
          <span className="min-w-0 flex-1">
            Burn it back: <b>{burn.rounds} {burn.rounds === 1 ? "round" : "rounds"}</b> of <b className="truncate">{burn.card.title}</b> (~{burn.minutes} min)
          </span>
          <Play aria-hidden="true" size={16} weight="fill" className="shrink-0 text-volt" />
        </Link>
      ) : (
        <p className="mt-2 flex items-center gap-2 rounded-2xl bg-electric-soft px-3 py-2 text-sm">
          <Fire aria-hidden="true" size={18} weight="fill" className="shrink-0 text-blaze" />
          Burn it back: ~{burn.walkMinutes} min brisk walk. Save a workout reel to turn this into your own workout.
        </p>
      )}
    </>
  );
}

function GoalsEditor({ goals, onSaved }: { goals: Goals; onSaved: (g: Goals) => void }) {
  const [draft, setDraft] = useState(goals);
  const [status, setStatus] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/goals", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goals: draft }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok) {
      onSaved(data.goals);
      setStatus("Saved");
    } else setStatus(data?.error ?? "Couldn't save");
    setTimeout(() => setStatus(null), 2000);
  }

  const field = (key: keyof Goals, label: string, unit: string) => (
    <label className="flex flex-col gap-1 text-xs font-semibold text-ink/60">
      {label}
      <span className="flex items-center rounded-xl bg-canvas pr-2 focus-within:ring-2 focus-within:ring-electric">
        <input
          type="number"
          inputMode="numeric"
          value={draft[key]}
          onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
          className="w-full min-w-0 bg-transparent px-2 py-2 text-base font-bold text-ink outline-none"
        />
        <span className="text-ink/40">{unit}</span>
      </span>
    </label>
  );

  return (
    <details className="rounded-3xl bg-surface p-4">
      <summary className="flex cursor-pointer items-center gap-2 font-semibold">
        <Gear aria-hidden="true" size={18} weight="bold" className="text-volt" /> Daily goals
      </summary>
      <form onSubmit={save} className="mt-3 flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          {field("calories", "Calories", "kcal")}
          {field("proteinGrams", "Protein", "g")}
          {field("weightKg", "Weight", "kg")}
        </div>
        <p className="text-xs text-ink/50">Weight is used to estimate calories burned. A common protein target is about 1–1.2 g per kg.</p>
        <button type="submit" className="rounded-2xl bg-volt py-3 font-bold text-white">
          {status ?? "Save goals"}
        </button>
      </form>
    </details>
  );
}

function Stat({ color, label, value, unit }: { color: string; label: string; value: number; unit: string }) {
  return (
    <div className="min-w-0">
      <dd className="font-display text-2xl font-black leading-none tabular-nums">{value}</dd>
      <dt className="mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/75">
        <span className="size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
        <span className="truncate">
          {label} <span className="font-semibold normal-case tracking-normal text-white/55">{unit}</span>
        </span>
      </dt>
    </div>
  );
}

function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={`Remove ${label}`} className="grid size-9 shrink-0 place-items-center rounded-full text-ink/40 hover:bg-canvas hover:text-volt">
      <Trash aria-hidden="true" size={16} weight="bold" />
    </button>
  );
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
