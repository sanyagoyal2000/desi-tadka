import { deleteCard, getCard, setFavorite } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/cards/[id]">) {
  const card = await getCard((await ctx.params).id);
  return card ? Response.json({ card }) : Response.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/cards/[id]">) {
  const body = await req.json().catch(() => ({}));
  if (typeof body.favorite !== "boolean") return Response.json({ error: "Send { favorite: boolean }" }, { status: 400 });
  const card = await setFavorite((await ctx.params).id, body.favorite);
  return card ? Response.json({ card }) : Response.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/cards/[id]">) {
  return (await deleteCard((await ctx.params).id)) ? new Response(null, { status: 204 }) : Response.json({ error: "Not found" }, { status: 404 });
}
