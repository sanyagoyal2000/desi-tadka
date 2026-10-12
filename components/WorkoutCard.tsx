/* eslint-disable @next/next/no-img-element */
import type { WorkoutCard as Workout } from "@/lib/schema";
import CardImage from "./CardImage";
import SwapButton from "./SwapButton";
import RoutineButton from "./RoutineButton";
import { ArrowsClockwise, Barbell } from "@phosphor-icons/react/dist/ssr";

type Props = {
  card: Workout;
  onSwap?: (index: number) => void; // edit mode when provided
  busyIndex?: number | null;
  canAddToRoutine?: boolean; // saved cards only: lets single exercises go into My routine
};

export default function WorkoutCard({ card, onSwap, busyIndex, canAddToRoutine }: Props) {
  return (
    <article className="overflow-hidden rounded-3xl bg-surface shadow-[0_8px_30px_rgba(24,12,80,0.10)]">
      <CardImage src={card.exercises[0]?.image ?? ""} alt={card.title} kind="workout" badge={card.exercises.some((e) => e.swapped) ? "Personalized" : undefined} />
      <div className="p-5">
        <span className="text-xs font-bold uppercase tracking-widest text-volt">Workout</span>
        <h2 className="font-display text-3xl font-extrabold leading-tight">{card.title}</h2>

        <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
          <Stat label="rounds" value={`${card.rounds}`} />
          <Stat label="exercises" value={`${card.exercises.length}`} />
        </dl>

        <h3 className="mt-5 font-display text-xl font-bold">Exercises</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {card.exercises.map((ex, i) => (
            <li key={i} className={`flex items-center gap-3 rounded-2xl p-2 ${ex.swapped ? "bg-electric-soft ring-2 ring-electric" : "bg-canvas"}`}>
              <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-electric-soft text-electric">
                {ex.image ? <img src={ex.image} alt={ex.name} className="size-full object-cover" /> : <Barbell aria-hidden="true" size={28} weight="duotone" />}
                {ex.swapped && <span className="absolute inset-x-0 bottom-0 bg-electric text-center text-[9px] font-bold text-white">Personalized</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {ex.swapped && <ArrowsClockwise aria-label="Personalized" size={15} weight="bold" className="mr-1 inline-block align-[-2px] text-electric" />}
                  {ex.name}
                </p>
                <p className="text-sm text-ink/60">
                  {ex.reps}
                  {ex.swapped && ex.original && <span className="ml-2 line-through decoration-volt/60">{ex.original}</span>}
                </p>
              </div>
              {onSwap && <SwapButton label={ex.name} onClick={() => onSwap(i)} busy={busyIndex === i} />}
              {canAddToRoutine && <RoutineButton exercise={ex} cardId={card.id} cardTitle={card.title} />}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-2xl bg-canvas px-2 py-3">
      <dd className={`font-display font-extrabold leading-none text-volt ${small ? "text-base" : "text-2xl"}`}>{value}</dd>
      <dt className="mt-1 text-xs font-medium text-ink/60">{label}</dt>
    </div>
  );
}
