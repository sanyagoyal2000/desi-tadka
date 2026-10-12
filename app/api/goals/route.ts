import { GoalsSchema } from "@/lib/schema";
import { getGoals, saveGoals } from "@/lib/store";

export async function GET() {
  return Response.json({ goals: await getGoals() });
}

// { goals: { calories, proteinGrams, weightKg } } → { goals }
export async function PUT(req: Request) {
  const parsed = GoalsSchema.safeParse((await req.json().catch(() => ({}))).goals);
  if (!parsed.success) return Response.json({ error: "Those goals look off." }, { status: 400 });
  return Response.json({ goals: await saveGoals(parsed.data) });
}
