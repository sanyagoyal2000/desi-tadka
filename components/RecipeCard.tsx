import type { RecipeCard as Recipe } from "@/lib/schema";
import CardImage from "./CardImage";
import SwapButton from "./SwapButton";

type Props = {
  card: Recipe;
  onSwap?: (index: number) => void; // edit mode when provided
  busyIndex?: number | null;
};

export default function RecipeCard({ card, onSwap, busyIndex }: Props) {
  const anySwapped = card.ingredients.some((i) => i.swapped);
  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgba(42,26,16,0.10)]">
      <CardImage src={card.image} alt={card.title} badge={anySwapped && !card.imageIsGenerated ? "swapped" : undefined} />
      <div className="p-5">
        <span className="text-xs font-bold uppercase tracking-widest text-chili">Recipe</span>
        <h2 className="font-display text-3xl font-extrabold leading-tight">{card.title}</h2>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="protein" value={`${card.proteinGrams}g`} />
          <Stat label="calories" value={`${card.calories}`} />
          <Stat label="prep" value={`${card.prepTimeMinutes} min`} />
        </dl>
        <p className="mt-1 text-right text-[11px] text-ink/50">per serving · approx.</p>

        <h3 className="mt-4 font-display text-xl font-bold">Ingredients</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {card.ingredients.map((ing, i) => (
            <li
              key={i}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${ing.swapped ? "bg-turmeric-soft ring-2 ring-turmeric" : "bg-cream"}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {ing.swapped && <span className="mr-1 text-turmeric">↺</span>}
                  {ing.name}
                </p>
                <p className="text-sm text-ink/60">
                  {ing.quantity}
                  {ing.swapped && ing.original && <span className="ml-2 line-through decoration-chili/60">{ing.original}</span>}
                </p>
              </div>
              {onSwap && <SwapButton label={ing.name} onClick={() => onSwap(i)} busy={busyIndex === i} />}
            </li>
          ))}
        </ul>

        <h3 className="mt-5 font-display text-xl font-bold">
          Steps <span className="text-base font-semibold text-ink/50">· {card.steps.length}</span>
        </h3>
        <ol className="mt-2 flex flex-col gap-3">
          {card.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-chili text-sm font-bold text-white">{i + 1}</span>
              <p className="pt-0.5 leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream px-2 py-3">
      <dd className="font-display text-2xl font-extrabold leading-none text-chili">{value}</dd>
      <dt className="mt-1 text-xs font-medium text-ink/60">{label}</dt>
    </div>
  );
}
