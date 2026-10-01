import { RoutineItemSchema } from "@/lib/schema";
import { addToRoutine, listRoutine, removeFromRoutine } from "@/lib/store";

const NewItemSchema = RoutineItemSchema.omit({ id: true, addedAt: true });

export async function GET() {
  return Response.json({ items: await listRoutine() });
}

// { item: { name, reps, image, cardId, cardTitle } } → { item }
export async function POST(req: Request) {
  const parsed = NewItemSchema.safeParse((await req.json().catch(() => ({}))).item);
  if (!parsed.success) return Response.json({ error: "Bad exercise" }, { status: 400 });
  return Response.json({ item: await addToRoutine(parsed.data) }, { status: 201 });
}

// ?id=move-… → 204
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  return (await removeFromRoutine(id)) ? new Response(null, { status: 204 }) : Response.json({ error: "Not found" }, { status: 404 });
}
