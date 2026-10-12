import { notFound } from "next/navigation";
import Coach from "@/components/Coach";
import { getCard, getGoals } from "@/lib/store";

// Full-screen camera coach for a saved workout.
export default async function CoachPage(props: PageProps<"/cards/[id]/coach">) {
  const card = await getCard((await props.params).id);
  if (!card || card.kind !== "workout" || card.exercises.length === 0) notFound();
  const { weightKg } = await getGoals();
  return <Coach card={card} weightKg={weightKg} />;
}
