import { CardSchema } from "@/lib/schema";
import { AIConfigError, SwapLimitError, applyRecipeSwap, applyWorkoutSwap, makeVegetarian } from "@/lib/ai";

// { card, action: "swap", index, to } | { card, action: "vegetarian" } → { card }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = CardSchema.safeParse(body.card);
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const card = parsed.data;

  try {
    if (card.kind === "recipe") {
      if (body.action === "vegetarian") return Response.json({ card: await makeVegetarian(card) });
      if (body.action === "swap" && Number.isInteger(body.index) && typeof body.to === "string" && body.to.trim()) {
        return Response.json({ card: await applyRecipeSwap(card, body.index, body.to.trim()) });
      }
    }
    if (card.kind === "workout" && body.action === "swap" && Number.isInteger(body.index) && typeof body.to === "string" && body.to.trim()) {
      return Response.json({ card: await applyWorkoutSwap(card, body.index, body.to.trim()) });
    }
    return Response.json({ error: "Bad request" }, { status: 400 });
  } catch (err) {
    if (err instanceof SwapLimitError) return Response.json({ error: err.message }, { status: 409 });
    if (err instanceof AIConfigError) return Response.json({ error: err.message }, { status: 503 });
    return Response.json({ error: "Couldn't apply that swap, try again." }, { status: 502 });
  }
}
