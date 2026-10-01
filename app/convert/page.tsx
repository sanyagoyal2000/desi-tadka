"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDraft } from "@/lib/draft";
import type { Card } from "@/lib/schema";
import RecipeCard from "@/components/RecipeCard";
import WorkoutCard from "@/components/WorkoutCard";

export default function ConvertPage() {
  const router = useRouter();
  const draft = useDraft<{ card: Card }>();

  useEffect(() => {
    if (draft === null) router.replace("/");
  }, [draft, router]);

  if (!draft) return null;
  const { card } = draft;
  return <main className="flex flex-col gap-4">{card.kind === "recipe" ? <RecipeCard card={card} /> : <WorkoutCard card={card} />}</main>;
}
