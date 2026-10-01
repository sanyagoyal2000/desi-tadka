/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Card } from "@/lib/schema";

const PAGE_SIZE = 4;
const SWIPE_OPEN = 96; // px the row slides left to reveal Delete

type Kind = Card["kind"];

const SECTIONS: { kind: Kind; title: string; emoji: string; empty: string; accent: string }[] = [
  { kind: "recipe", title: "Recipes", emoji: "🍛", empty: "No recipes yet. Share a recipe reel or idea above.", accent: "text-chili" },
  { kind: "workout", title: "Workouts", emoji: "💪", empty: "No workouts yet. Share a workout reel or idea above.", accent: "text-leaf" },
];

type Actions = { onToggleFavorite: (c: Card) => void; onDelete: (c: Card) => void };

export default function SavedList({ cards, filtering, ...actions }: { cards: Card[] | null; filtering: boolean } & Actions) {
  return (
    <div className="flex flex-col gap-8">
      {SECTIONS.map((s) => (
        <Section key={s.kind} {...s} {...actions} filtering={filtering} cards={cards?.filter((c) => c.kind === s.kind) ?? null} />
      ))}
    </div>
  );
}

function Section({
  title,
  emoji,
  empty,
  accent,
  cards,
  filtering,
  ...actions
}: (typeof SECTIONS)[number] & Actions & { cards: Card[] | null; filtering: boolean }) {
  const [page, setPage] = useState(0);
  const pageCount = cards ? Math.max(1, Math.ceil(cards.length / PAGE_SIZE)) : 1;
  const current = Math.min(page, pageCount - 1);
  const visible = cards?.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE) ?? [];
  const headingId = `${title.toLowerCase()}-heading`;

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id={headingId} className="font-display text-2xl font-extrabold">
          <span aria-hidden="true">{emoji}</span> {title}
        </h2>
        {cards && cards.length > 0 && <span className={`rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold ${accent}`}>{cards.length}</span>}
      </div>

      {cards === null ? (
        <div className="flex flex-col gap-3">
          <div className="h-24 animate-pulse rounded-3xl bg-surface/60" />
          <div className="h-24 animate-pulse rounded-3xl bg-surface/60" />
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-turmeric/50 px-6 py-6 text-center">
          <p className="text-sm text-ink/60">{filtering ? `No ${title.toLowerCase()} match.` : empty}</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {visible.map((c) => (
              <li key={c.id}>
                <SwipeRow card={c} {...actions} />
              </li>
            ))}
          </ul>
          {current === 0 && cards.length > 0 && !filtering && (
            <p className="mt-2 text-center text-[11px] text-ink/40">Swipe a card left to delete · ★ to pin it to the top</p>
          )}
          {pageCount > 1 && <Pager title={title} page={current} pageCount={pageCount} onChange={setPage} />}
        </>
      )}
    </section>
  );
}

// Card row that slides left (touch or mouse drag) to reveal a Delete button.
function SwipeRow({ card: c, onToggleFavorite, onDelete }: { card: Card } & Actions) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; base: number; moved: boolean } | null>(null);
  const open = offset <= -SWIPE_OPEN / 2;

  const image = c.kind === "recipe" ? c.image : c.exercises[0]?.image;
  const swaps = c.kind === "recipe" ? c.ingredients.filter((i) => i.swapped).length : c.swapCount;

  return (
    <div className={`relative overflow-hidden rounded-3xl ${offset < 0 ? "bg-chili" : ""}`}>
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        onClick={() => onDelete(c)}
        className={`absolute inset-y-0 right-0 w-24 font-display text-lg font-bold text-white ${offset < 0 ? "" : "invisible"}`}
      >
        Delete
      </button>
      <div
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
        className={`relative flex select-none items-center rounded-3xl bg-surface shadow-[0_4px_16px_rgba(42,26,16,0.06)] ${dragging ? "" : "transition-transform duration-200"}`}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, base: offset, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          if (!d.moved && Math.abs(dx) < 8) return;
          if (!d.moved) {
            d.moved = true;
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          setOffset(Math.max(-SWIPE_OPEN, Math.min(0, d.base + dx)));
        }}
        onPointerUp={() => {
          setDragging(false);
          setOffset((o) => (o <= -SWIPE_OPEN / 2 ? -SWIPE_OPEN : 0));
          // leave `moved` set until the click that follows a drag has been swallowed
          setTimeout(() => (drag.current = null));
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
          setOffset(0);
        }}
      >
        <Link
          href={`/cards/${c.id}`}
          draggable={false}
          onClick={(e) => {
            if (drag.current?.moved || open) {
              e.preventDefault();
              if (open && !drag.current?.moved) setOffset(0);
            }
          }}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-3xl p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turmeric"
        >
          <div className="size-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-turmeric to-chili">
            {image ? <img src={image} alt="" draggable={false} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-3xl">🌶️</div>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold leading-tight">{c.title}</p>
            <p className="text-xs text-ink/60">
              {c.kind === "recipe" ? `${c.proteinGrams}g protein · ${c.calories} cal` : `${c.exercises.length} exercises · ${c.rounds} rounds`}
              {swaps > 0 && <span className="ml-1 font-semibold text-turmeric">· ↺ {swaps}</span>}
            </p>
          </div>
        </Link>
        <button
          type="button"
          aria-pressed={Boolean(c.favorite)}
          aria-label={c.favorite ? `Unpin ${c.title}` : `Pin ${c.title} to the top`}
          onClick={() => onToggleFavorite(c)}
          className={`mr-2 grid size-11 shrink-0 place-items-center rounded-full text-2xl transition hover:bg-cream focus-visible:outline-2 focus-visible:outline-turmeric ${
            c.favorite ? "text-turmeric" : "text-ink/25"
          }`}
        >
          {c.favorite ? "★" : "☆"}
        </button>
      </div>
    </div>
  );
}

function Pager({ title, page, pageCount, onChange }: { title: string; page: number; pageCount: number; onChange: (p: number) => void }) {
  const btn =
    "grid size-10 place-items-center rounded-full bg-surface font-display text-xl font-bold shadow-[0_2px_8px_rgba(42,26,16,0.08)] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-turmeric";
  return (
    <nav aria-label={`${title} pages`} className="mt-4 flex items-center justify-center gap-3">
      <button type="button" className={btn} disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Previous page">
        ‹
      </button>
      <div className="flex gap-1.5">
        {Array.from({ length: pageCount }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            aria-label={`Page ${i + 1}`}
            aria-current={i === page ? "page" : undefined}
            className={`h-2.5 rounded-full transition-all ${i === page ? "w-6 bg-chili" : "w-2.5 bg-ink/20 hover:bg-ink/40"}`}
          />
        ))}
      </div>
      <button type="button" className={btn} disabled={page === pageCount - 1} onClick={() => onChange(page + 1)} aria-label="Next page">
        ›
      </button>
    </nav>
  );
}
