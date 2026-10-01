import { CardSchema } from "@/lib/schema";
import { listCards, saveCard } from "@/lib/store";

export async function GET() {
  return Response.json({ cards: await listCards() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = CardSchema.safeParse(body.card);
  if (!parsed.success) return Response.json({ error: "Bad card" }, { status: 400 });
  return Response.json({ card: await saveCard(parsed.data) }, { status: 201 });
}
