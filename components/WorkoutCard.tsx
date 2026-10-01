/* eslint-disable @next/next/no-img-element */
import type { WorkoutCard as Workout } from "@/lib/schema";
import CardImage from "./CardImage";
import SwapButton from "./SwapButton";

type Props = {
  card: Workout;
  onSwap?: (index: number) => void; // edit mode when provided
  busyIndex?: number | null;
};

export default function WorkoutCard({ card, onSwap, busyIndex }: Props) {
  return (
    <article className="overflow-hidden rounded-3xl bg-surface shadow-[0_8px_30px_rgba(42,26,16,0.10)]">
      <CardImage src={card.exercises[0]?.image ?? ""} alt={card.title} />
      <div className="p-5">
        <span className="text-xs font-bold uppercase tracking-widest text-chili">Workout</span>
        <h2 className="font-display text-3xl font-extrabold leading-tight">{card.title}</h2>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="rounds" value={`${card.rounds}`} />
          <Stat label="exercises" value={`${card.exercises.length}`} />
          <Stat label="how often" value={card.frequency || "—"} small />
        </dl>

        <h3 className="mt-5 font-display text-xl font-bold">Exercises</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {card.exercises.map((ex, i) => (
            <li key={i} className={`flex items-center gap-3 rounded-2xl p-2 ${ex.swapped ? "bg-turmeric-soft ring-2 ring-turmeric" : "bg-cream"}`}>
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-turmeric to-chili">
                {ex.image ? <img src={ex.image} alt={ex.name} className="size-full object-cover" /> : null}
                {ex.swapped && <span className="absolute inset-x-0 bottom-0 bg-turmeric text-center text-[10px] font-bold uppercase text-white">swapped</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {ex.swapped && <span className="mr-1 text-turmeric">↺</span>}
                  {ex.name}
                </p>
                <p className="text-sm text-ink/60">
                  {ex.reps}
                  {ex.swapped && ex.original && <span className="ml-2 line-through decoration-chili/60">{ex.original}</span>}
                </p>
              </div>
              {onSwap && <SwapButton label={ex.name} onClick={() => onSwap(i)} busy={busyIndex === i} />}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-2xl bg-cream px-2 py-3">
      <dd className={`font-display font-extrabold leading-none text-chili ${small ? "text-base" : "text-2xl"}`}>{value}</dd>
      <dt className="mt-1 text-xs font-medium text-ink/60">{label}</dt>
    </div>
  );
}
