import { CardSchema } from "@/lib/schema";
import { AIConfigError, suggestSwaps } from "@/lib/ai";

// { card, item, hint? } → { suggestions: string[] }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const card = CardSchema.safeParse(body.card);
  if (!card.success || typeof body.item !== "string") return Response.json({ error: "Bad request" }, { status: 400 });
  try {
    return Response.json({ suggestions: await suggestSwaps(card.data, body.item, typeof body.hint === "string" ? body.hint : undefined) });
  } catch (err) {
    if (err instanceof AIConfigError) return Response.json({ error: err.message }, { status: 503 });
    return Response.json({ error: "Couldn't get suggestions, try again or type your own." }, { status: 502 });
  }
}
