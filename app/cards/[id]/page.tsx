import Link from "next/link";
import { notFound } from "next/navigation";
import { getCard } from "@/lib/store";
import RecipeCard from "@/components/RecipeCard";
import WorkoutCard from "@/components/WorkoutCard";
import CardActions from "@/components/CardActions";

// Saved card with swaps applied, plus share / plan / pin / delete.
export default async function CardDetail(props: PageProps<"/cards/[id]">) {
  const card = await getCard((await props.params).id);
  if (!card) notFound();
  return (
    <main className="flex flex-col gap-4">
      <Link href="/" className="font-semibold text-chili">
        ← Home
      </Link>
      {card.kind === "recipe" ? <RecipeCard card={card} /> : <WorkoutCard card={card} />}
      <CardActions card={card} />
      {card.sourceUrl && (
        <a href={card.sourceUrl} target="_blank" rel="noreferrer" className="text-center text-sm text-ink/50 underline">
          Original reel
        </a>
      )}
    </main>
  );
}
