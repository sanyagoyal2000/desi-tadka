/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Barbell, Bell, Lightning, X } from "@phosphor-icons/react/dist/ssr";
import type { RoutineItem } from "@/lib/schema";
import { forgetRoutine, loadRoutine } from "@/lib/routineClient";

const DAYS = [
  { code: "MO", label: "M", long: "Monday" },
  { code: "TU", label: "T", long: "Tuesday" },
  { code: "WE", label: "W", long: "Wednesday" },
  { code: "TH", label: "T", long: "Thursday" },
  { code: "FR", label: "F", long: "Friday" },
  { code: "SA", label: "S", long: "Saturday" },
  { code: "SU", label: "S", long: "Sunday" },
] as const;

// Single exercises collected from saved workouts, plus a weekly calendar nudge to actually do them.
export default function RoutineSection() {
  const [items, setItems] = useState<RoutineItem[] | null>(null);
  const [days, setDays] = useState<Set<string>>(new Set(["MO", "WE", "FR"]));
  const [time, setTime] = useState("07:00");

  useEffect(() => {
    forgetRoutine(); // Home is where changes made on card pages show up
    loadRoutine().then(setItems);
  }, []);

  async function remove(item: RoutineItem) {
    setItems((xs) => xs?.filter((x) => x.id !== item.id) ?? xs);
    const res = await fetch(`/api/routine?${new URLSearchParams({ id: item.id })}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) setItems((xs) => (xs ? [...xs, item] : xs));
    forgetRoutine();
  }

  function toggleDay(code: string) {
    setDays((prev) => {
      const next = new Set(prev);
      if (!next.delete(code)) next.add(code);
      return next;
    });
  }

  function remind() {
    const order = DAYS.map((d) => d.code).filter((c) => days.has(c));
    const a = document.createElement("a");
    a.href = `/api/reminder?${new URLSearchParams({ routine: "1", days: order.join(","), time })}`;
    a.click();
  }

  return (
    <section id="routine" aria-labelledby="routine-heading" className="scroll-mt-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="routine-heading" className="flex items-center gap-2 font-display text-2xl font-extrabold">
          <Lightning aria-hidden="true" size={24} weight="duotone" className="text-turmeric" /> My routine
        </h2>
        {items && items.length > 0 && <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-turmeric">{items.length}</span>}
      </div>

      {items === null ? (
        <div className="h-24 animate-pulse rounded-3xl bg-surface/60" />
      ) : items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-turmeric/50 px-6 py-6 text-center text-sm text-ink/60">
          Want just 1–2 moves from a workout? Open a saved workout and tap <span className="font-semibold text-turmeric">+ Routine</span> on an exercise. They collect here.
        </div>
      ) : (
        <div className="rounded-3xl bg-surface p-3 shadow-[0_4px_16px_rgba(42,26,16,0.06)]">
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-cream p-2">
                <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-turmeric-soft text-turmeric">
                  {item.image ? <img src={item.image} alt="" className="size-full object-cover" /> : <Barbell aria-hidden="true" size={24} weight="duotone" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.name}</p>
                  <p className="truncate text-xs text-ink/60">
                    {item.reps} · from{" "}
                    <Link href={`/cards/${item.cardId}`} className="font-semibold text-chili hover:underline">
                      {item.cardTitle}
                    </Link>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(item)}
                  aria-label={`Remove ${item.name} from my routine`}
                  className="grid size-10 shrink-0 place-items-center rounded-full text-ink/40 hover:bg-surface hover:text-chili focus-visible:outline-2 focus-visible:outline-turmeric"
                >
                  <X aria-hidden="true" size={16} weight="bold" />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-3 border-t border-cream pt-3">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Bell aria-hidden="true" size={18} weight="bold" className="text-chili" /> Weekly nudge
            </p>
            <div className="mt-2 flex items-end gap-2">
              <div role="group" aria-label="Days" className="grid flex-1 grid-cols-7 gap-1">
                {DAYS.map((d) => {
                  const on = days.has(d.code);
                  return (
                    <button
                      key={d.code}
                      type="button"
                      aria-pressed={on}
                      aria-label={d.long}
                      onClick={() => toggleDay(d.code)}
                      className={`h-10 rounded-xl text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-turmeric ${
                        on ? "bg-chili text-white" : "bg-cream text-ink/60 hover:text-ink"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <label className="sr-only" htmlFor="routine-time">
                Time
              </label>
              <input
                id="routine-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-10 w-28 rounded-xl bg-cream px-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-turmeric"
              />
            </div>
            <button
              type="button"
              onClick={remind}
              disabled={days.size === 0 || !time}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-chili py-3 font-display text-lg font-bold text-white disabled:opacity-50"
            >
              <Bell aria-hidden="true" size={20} weight="fill" /> Add weekly reminder to Calendar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
