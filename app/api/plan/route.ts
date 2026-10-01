import { PlanSchema } from "@/lib/schema";
import { getPlan, savePlan } from "@/lib/store";

export async function GET() {
  return Response.json({ plan: await getPlan() });
}

export async function PUT(req: Request) {
  const parsed = PlanSchema.safeParse((await req.json().catch(() => ({}))).plan);
  if (!parsed.success) return Response.json({ error: "Bad plan" }, { status: 400 });
  return Response.json({ plan: await savePlan(parsed.data) });
}
