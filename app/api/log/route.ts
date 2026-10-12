import { LogEntrySchema } from "@/lib/schema";
import { addLogEntry, dayLog, removeLogEntry } from "@/lib/store";

const isDate = (d: string | null): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);

// ?date=YYYY-MM-DD → { entries }
export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date");
  if (!isDate(date)) return Response.json({ error: "Bad date" }, { status: 400 });
  return Response.json({ entries: await dayLog(date) });
}

// { date, entry } → { entry }. The browser sends its local date so "today" matches the phone.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const entry = LogEntrySchema.safeParse(body.entry);
  if (!isDate(body.date) || !entry.success) return Response.json({ error: "Bad log entry" }, { status: 400 });
  return Response.json({ entry: await addLogEntry(body.date, entry.data) }, { status: 201 });
}

// ?date=…&id=… → 204
export async function DELETE(req: Request) {
  const q = new URL(req.url).searchParams;
  const date = q.get("date");
  if (!isDate(date)) return Response.json({ error: "Bad date" }, { status: 400 });
  return (await removeLogEntry(date, q.get("id") ?? "")) ? new Response(null, { status: 204 }) : Response.json({ error: "Not found" }, { status: 404 });
}
