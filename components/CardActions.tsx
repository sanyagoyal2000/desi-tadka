"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Card, Plan } from "@/lib/schema";
import { addDays, dayLabel, todayISO } from "@/lib/plan";
import { shareImage, shareText } from "@/lib/shareCard";
import { Bell, CalendarBlank, CheckCircle, Copy, ImageSquare, ShareNetwork, Star } from "@phosphor-icons/react/dist/ssr";

const pill =
  "flex items-center justify-center gap-1.5 rounded-2xl px-3 py-3 text-sm font-bold shadow-[0_2px_8px_rgba(42,26,16,0.06)] transition hover:shadow-[0_4px_16px_rgba(42,26,16,0.12)] focus-visible:outline-2 focus-visible:outline-turmeric disabled:opacity-50";

// Share, plan, remind, pin and delete for a saved card.
export default function CardActions({ card: initial, justSaved = false }: { card: Card; justSaved?: boolean }) {
  const router = useRouter();
  const [card, setCard] = useState(initial);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [upcoming, setUpcoming] = useState<string[]>([]);
  const [remindDay, setRemindDay] = useState<string>("");
  const [remindTime, setRemindTime] = useState(initial.kind === "recipe" ? "18:00" : "07:00");

  useEffect(() => {
    fetch("/api/plan")
      .then((r) => r.json())
      .then((d) => {
        const today = todayISO();
        const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
        setUpcoming(days);
        setRemindDay(days.find((x) => d.plan?.days[x]?.includes(initial.id)) ?? days[0]);
        setPlan(d.plan);
      })
      .catch(() => {});
  }, [initial.id]);

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

  // Puts the card on that day in the plan, then opens a calendar event; iPhone shows "Add to Calendar".
  async function remind() {
    if (!plan || !remindDay) return;
    const ids = plan.days[remindDay] ?? [];
    if (!ids.includes(card.id)) {
      const next: Plan = { days: { ...plan.days, [remindDay]: [...ids, card.id] } };
      const res = await fetch("/api/plan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: next }) }).catch(() => null);
      if (res?.ok) setPlan(next);
    }
    // A calendar file, not a page: open it like the image download below.
    const a = document.createElement("a");
    a.href = `/api/reminder?${new URLSearchParams({ id: card.id, date: remindDay, time: remindTime })}`;
    a.click();
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
      {justSaved && (
        <p role="status" className="flex items-start gap-2 rounded-2xl bg-leaf px-4 py-3 text-sm font-semibold text-white">
          <CheckCircle aria-hidden="true" size={20} weight="fill" className="shrink-0" />
          <span>Saved! Pick a day below and get a reminder, so it doesn&apos;t end up forgotten like a saved reel.</span>
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={share} disabled={sharing} className={`${pill} col-span-3 bg-leaf text-base text-white`}>
          {sharing ? "Getting it ready…" : (
            <>
              <ShareNetwork aria-hidden="true" size={18} weight="bold" /> Share card
            </>
          )}
        </button>
        <button type="button" onClick={saveImage} className={`${pill} bg-surface`}>
          <ImageSquare aria-hidden="true" size={18} weight="bold" /> Image
        </button>
        <button type="button" onClick={copyText} className={`${pill} bg-surface`}>
          <Copy aria-hidden="true" size={18} weight="bold" /> Copy
        </button>
        <button type="button" onClick={toggleFavorite} aria-pressed={Boolean(card.favorite)} className={`${pill} bg-surface ${card.favorite ? "text-turmeric" : ""}`}>
          <Star aria-hidden="true" size={18} weight={card.favorite ? "fill" : "bold"} /> {card.favorite ? "Pinned" : "Pin"}
        </button>
      </div>
      {note && (
        <p role="status" className="text-center text-sm font-semibold text-leaf">
          {note}
        </p>
      )}

      <div className="rounded-3xl bg-surface p-4 shadow-[0_2px_8px_rgba(42,26,16,0.06)]">
        <p className="flex items-center gap-2 font-display text-lg font-bold">
          <CalendarBlank aria-hidden="true" size={20} weight="bold" className="text-chili" /> Add to my plan
        </p>
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

      <div id="remind" className="scroll-mt-4 rounded-3xl bg-surface p-4 shadow-[0_2px_8px_rgba(42,26,16,0.06)]">
        <p className="flex items-center gap-2 font-display text-lg font-bold">
          <Bell aria-hidden="true" size={20} weight="bold" className="text-chili" /> Remind me
        </p>
        <p className="text-xs text-ink/50">Adds it to your plan and to your phone&apos;s calendar, so you get a nudge on the day.</p>
        <div className="mt-3 flex gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-ink/60">
            Day
            <select
              value={remindDay}
              onChange={(e) => setRemindDay(e.target.value)}
              disabled={!plan}
              className="rounded-xl bg-cream px-3 py-2.5 text-base font-semibold text-ink outline-none focus:ring-2 focus:ring-turmeric"
            >
              {upcoming.map((d, i) => {
                const label = dayLabel(d);
                return (
                  <option key={d} value={d}>
                    {i === 0 ? "Today" : i === 1 ? "Tomorrow" : label.long}, {label.date}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="flex w-32 flex-col gap-1 text-xs font-semibold text-ink/60">
            Time
            <input
              type="time"
              value={remindTime}
              onChange={(e) => setRemindTime(e.target.value)}
              className="rounded-xl bg-cream px-3 py-2.5 text-base font-semibold text-ink outline-none focus:ring-2 focus:ring-turmeric"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={remind}
          disabled={!plan || !remindDay || !remindTime}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-chili py-3 font-display text-lg font-bold text-white disabled:opacity-50"
        >
          <Bell aria-hidden="true" size={20} weight="fill" /> Add reminder to Calendar
        </button>
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
