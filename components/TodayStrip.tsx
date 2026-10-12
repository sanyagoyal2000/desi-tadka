"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import Rings from "./Rings";
import type { Goals, LogEntry } from "@/lib/schema";
import { dayTotals, ringsFor } from "@/lib/fitness";
import { todayISO } from "@/lib/plan";
import { fetchDay, fetchGoals } from "@/lib/todayClient";

// Home's glance at today: the three rings and what's left, linking to the full Today page.
export default function TodayStrip() {
  const [data, setData] = useState<{ goals: Goals; entries: LogEntry[] } | null>(null);

  useEffect(() => {
    Promise.all([fetchGoals(), fetchDay(todayISO())])
      .then(([goals, entries]) => setData({ goals, entries }))
      .catch(() => {});
  }, []);

  if (!data) return <div className="h-[88px] animate-pulse rounded-3xl bg-surface/60" />;
  const totals = dayTotals(data.entries);
  const r = ringsFor(data.goals, totals);
  return (
    <Link href="/today" className="glow-card flex items-center gap-4 rounded-3xl p-3 pr-4 focus-visible:outline-2 focus-visible:outline-electric">
      <Rings size={64} rings={[{ pct: r.caloriePct, color: "#ffffff" }, { pct: r.proteinPct, color: "#43e8d0" }, { pct: r.burnPct, color: "#ff6fae" }]} />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-black uppercase leading-tight tracking-tight">
          {data.entries.length === 0 ? "Snap your first plate today" : r.caloriesLeft >= 0 ? `${r.caloriesLeft} kcal left` : `${-r.caloriesLeft} kcal over`}
        </span>
        <span className="block truncate text-sm text-white/75">
          {totals.protein}/{data.goals.proteinGrams} g protein · {totals.burned} kcal burned
        </span>
      </span>
      <CaretRight aria-hidden="true" size={18} weight="bold" className="text-white" />
    </Link>
  );
}
