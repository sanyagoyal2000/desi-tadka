import { CardSchema } from "@/lib/schema";
import { AIConfigError, suggestAllSwaps, suggestSwaps } from "@/lib/ai";

// { card, item, hint? } → { suggestions: string[] }  |  { card, all: true } → { all: { [item]: string[] } }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const card = CardSchema.safeParse(body.card);
  if (!card.success || (typeof body.item !== "string" && body.all !== true)) return Response.json({ error: "Bad request" }, { status: 400 });
  try {
    if (body.all === true) return Response.json({ all: await suggestAllSwaps(card.data) });
    return Response.json({ suggestions: await suggestSwaps(card.data, body.item, typeof body.hint === "string" ? body.hint : undefined) });
  } catch (err) {
    if (err instanceof AIConfigError) return Response.json({ error: err.message }, { status: 503 });
    return Response.json({ error: "Couldn't get suggestions, try again or type your own." }, { status: 502 });
  }
}
