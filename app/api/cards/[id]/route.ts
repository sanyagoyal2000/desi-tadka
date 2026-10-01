import { getCard } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/cards/[id]">) {
  const card = await getCard((await ctx.params).id);
  return card ? Response.json({ card }) : Response.json({ error: "Not found" }, { status: 404 });
}
