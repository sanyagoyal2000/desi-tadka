import { getCard, listRoutine } from "@/lib/store";
import { ICS_DAYS, buildIcs, type IcsDay } from "@/lib/reminder";
import { addDays, fromISO, todayISO } from "@/lib/plan";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// GET ?id=<card>&date=YYYY-MM-DD&time=HH:MM          → one reminder for a saved card
// GET ?routine=1&days=MO,WE,FR&time=HH:MM            → weekly reminder for "My routine"
// Returns an .ics file; the phone offers to add it to its calendar.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams;
  const time = q.get("time") ?? "";
  if (!TIME.test(time)) return Response.json({ error: "Pick a time" }, { status: 400 });
  const origin = `${url.protocol}//${req.headers.get("host") ?? url.host}`;

  if (q.get("routine")) {
    const days = (q.get("days") ?? "").split(",").filter((d): d is IcsDay => (ICS_DAYS as readonly string[]).includes(d));
    if (days.length === 0) return Response.json({ error: "Pick at least one day" }, { status: 400 });
    const items = await listRoutine();
    if (items.length === 0) return Response.json({ error: "Add exercises to your routine first" }, { status: 400 });
    return ics("desitadka-routine", {
      uid: `routine-${Date.now()}`,
      date: firstMatchingDay(days, time),
      time,
      minutes: 30,
      title: `Your routine: ${items.length} ${items.length === 1 ? "exercise" : "exercises"}`,
      description: [...items.map((i) => `• ${i.name} — ${i.reps}`), "", `Open DesiTadka: ${origin}/#routine`].join("\n"),
      url: `${origin}/#routine`,
      weeklyOn: days,
    });
  }

  const date = q.get("date") ?? "";
  if (!DATE.test(date)) return Response.json({ error: "Pick a day" }, { status: 400 });
  const card = await getCard(q.get("id") ?? "");
  if (!card) return Response.json({ error: "Card not found" }, { status: 404 });
  const link = `${origin}/cards/${card.id}`;

  if (card.kind === "recipe") {
    return ics(card.title, {
      uid: `${card.id}-${date}`,
      date,
      time,
      minutes: Math.max(15, card.prepTimeMinutes || 30),
      title: `Cook: ${card.title}`,
      description: [
        `~${card.proteinGrams} g protein · ${card.calories} cal · ${card.prepTimeMinutes} min`,
        "",
        "You'll need:",
        ...card.ingredients.map((i) => `• ${`${i.quantity} ${i.name}`.trim()}`),
        "",
        `Open the card: ${link}`,
      ].join("\n"),
      url: link,
    });
  }
  return ics(card.title, {
    uid: `${card.id}-${date}`,
    date,
    time,
    minutes: 30,
    title: `Workout: ${card.title}`,
    description: [`${card.rounds} rounds`, ...card.exercises.map((e) => `• ${e.name} — ${e.reps}`), "", `Open the card: ${link}`].join("\n"),
    url: link,
  });
}

function ics(name: string, event: Parameters<typeof buildIcs>[0]) {
  const file = `${name.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "reminder"}.ics`;
  return new Response(buildIcs(event), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `inline; filename="${file}"` },
  });
}

// The weekly series starts on the next chosen weekday (today if the time hasn't passed yet).
function firstMatchingDay(days: IcsDay[], time: string): string {
  const today = todayISO();
  const now = new Date();
  const [hh, mm] = time.split(":").map(Number);
  for (let i = 0; i < 8; i++) {
    const date = addDays(today, i);
    const code = ICS_DAYS[(fromISO(date).getDay() + 6) % 7];
    if (!days.includes(code)) continue;
    if (i === 0 && (now.getHours() > hh || (now.getHours() === hh && now.getMinutes() >= mm))) continue;
    return date;
  }
  return today;
}
