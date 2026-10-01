"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Card, Plan } from "@/lib/schema";
import { addDays, dayLabel, todayISO } from "@/lib/plan";
import { shareImage, shareText } from "@/lib/shareCard";

const pill =
  "flex items-center justify-center gap-1.5 rounded-2xl px-3 py-3 text-sm font-bold shadow-[0_2px_8px_rgba(42,26,16,0.06)] transition hover:shadow-[0_4px_16px_rgba(42,26,16,0.12)] focus-visible:outline-2 focus-visible:outline-turmeric disabled:opacity-50";

// Share, plan, pin and delete for a saved card.
export default function CardActions({ card: initial }: { card: Card }) {
  const router = useRouter();
  const [card, setCard] = useState(initial);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [upcoming, setUpcoming] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/plan")
      .then((r) => r.json())
      .then((d) => {
        const today = todayISO();
        setUpcoming(Array.from({ length: 7 }, (_, i) => addDays(today, i)));
        setPlan(d.plan);
      })
      .catch(() => {});
  }, []);

  const flash = (msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(null), 2500);
  };

  async function share() {
    setSharing(true);
    const text = shareText(card);
    try {
      const blob = await shareImage(card);
      const file = blob && new File([blob], `${card.title.replace(/[^\w]+/g, "-").toLowerCase()}.png`, { type: "image/png" });
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: card.title, text, files: [file] });
      } else if (navigator.share) {
        await navigator.share({ title: card.title, text });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) flash("Couldn't share. Try saving the image instead.");
    } finally {
      setSharing(false);
    }
  }

  async function saveImage() {
    const blob = await shareImage(card);
    if (!blob) return flash("Couldn't draw the image.");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${card.title.replace(/[^\w]+/g, "-").toLowerCase()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(shareText(card));
      flash("Copied — paste it anywhere.");
    } catch {
      flash("Couldn't copy.");
    }
  }

  async function toggleDay(date: string) {
    if (!plan) return;
    const ids = plan.days[date] ?? [];
    const next: Plan = { days: { ...plan.days, [date]: ids.includes(card.id) ? ids.filter((x) => x !== card.id) : [...ids, card.id] } };
    setPlan(next);
    const res = await fetch("/api/plan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: next }) }).catch(() => null);
    if (!res?.ok) {
      setPlan(plan);
      flash("Couldn't update your plan.");
    }
  }

  async function toggleFavorite() {
    const favorite = !card.favorite;
    setCard({ ...card, favorite });
    const res = await fetch(`/api/cards/${card.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ favorite }) }).catch(() => null);
    if (!res?.ok) setCard({ ...card, favorite: !favorite });
  }

  async function remove() {
    const res = await fetch(`/api/cards/${card.id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) router.push("/");
    else flash("Couldn't delete.");
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={share} disabled={sharing} className={`${pill} col-span-3 bg-leaf text-base text-white`}>
          {sharing ? "Getting it ready…" : "📤 Share card"}
        </button>
        <button type="button" onClick={saveImage} className={`${pill} bg-surface`}>
          🖼 Image
        </button>
        <button type="button" onClick={copyText} className={`${pill} bg-surface`}>
          📋 Copy
        </button>
        <button type="button" onClick={toggleFavorite} aria-pressed={Boolean(card.favorite)} className={`${pill} bg-surface ${card.favorite ? "text-turmeric" : ""}`}>
          {card.favorite ? "★ Pinned" : "☆ Pin"}
        </button>
      </div>
      {note && (
        <p role="status" className="text-center text-sm font-semibold text-leaf">
          {note}
        </p>
      )}

      <div className="rounded-3xl bg-surface p-4 shadow-[0_2px_8px_rgba(42,26,16,0.06)]">
        <p className="font-display text-lg font-bold">📅 Add to my plan</p>
        <p className="text-xs text-ink/50">Next 7 days — older and later dates are on the Plan page.</p>
        <div role="group" aria-label="Days" className="mt-2 grid grid-cols-7 gap-1.5">
          {upcoming.map((d, i) => {
            const on = plan?.days[d]?.includes(card.id) ?? false;
            const label = dayLabel(d);
            return (
              <button
                key={d}
                type="button"
                disabled={!plan}
                aria-pressed={on}
                aria-label={`${label.long} ${label.date}`}
                onClick={() => toggleDay(d)}
                className={`flex flex-col items-center rounded-xl py-1.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-turmeric disabled:opacity-40 ${
                  on ? "bg-chili text-white" : "bg-cream text-ink/70 hover:text-ink"
                }`}
              >
                <span className="text-[10px] font-semibold opacity-70">{i === 0 ? "Today" : label.short}</span>
                <span className="text-base leading-tight">{label.dayOfMonth}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-center">
        {confirmDelete ? (
          <p className="flex items-center justify-center gap-3 text-sm">
            <span className="font-semibold">Delete this card for good?</span>
            <button type="button" onClick={remove} className="rounded-full bg-chili px-3 py-1 font-bold text-white">
              Delete
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="font-semibold text-ink/60">
              Cancel
            </button>
          </p>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm font-semibold text-chili underline-offset-4 hover:underline">
            Delete card
          </button>
        )}
      </div>
    </section>
  );
}
