/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Card } from "@/lib/schema";

export default function SavedList({ cards }: { cards: Card[] | null }) {
  if (cards === null) return <div className="h-24 animate-pulse rounded-3xl bg-white/60" />;
  if (cards.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-turmeric/50 p-8 text-center">
        <p className="text-4xl">🍛</p>
        <p className="mt-2 font-display text-xl font-bold">No cards yet</p>
        <p className="text-sm text-ink/60">Paste your first recipe or workout reel above and give it some desi tadka.</p>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {cards.map((c) => {
        const image = c.kind === "recipe" ? c.image : c.exercises[0]?.image;
        const swaps = c.kind === "recipe" ? c.ingredients.filter((i) => i.swapped).length : c.swapCount;
        return (
          <li key={c.id}>
            <Link href={`/cards/${c.id}`} className="flex items-center gap-3 rounded-3xl bg-white p-2 pr-4 shadow-[0_4px_16px_rgba(42,26,16,0.06)] active:scale-[0.99]">
              <div className="size-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-turmeric to-chili">
                {image ? <img src={image} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-3xl">🌶️</div>}
              </div>
              <div className="min-w-0 flex-1">
                <span className={`text-[11px] font-bold uppercase tracking-widest ${c.kind === "recipe" ? "text-chili" : "text-leaf"}`}>{c.kind}</span>
                <p className="truncate font-display text-lg font-bold leading-tight">{c.title}</p>
                <p className="text-xs text-ink/60">
                  {c.kind === "recipe" ? `${c.proteinGrams}g protein · ${c.calories} cal` : `${c.exercises.length} exercises · ${c.rounds} rounds`}
                  {swaps > 0 && <span className="ml-1 font-semibold text-turmeric">· ↺ {swaps}</span>}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
