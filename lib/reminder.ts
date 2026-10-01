// Builds .ics calendar events. Opening one on an iPhone shows "Add to Calendar",
// and the phone's own alert does the nudging even when DesiTadka isn't open.

export const ICS_DAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
export type IcsDay = (typeof ICS_DAYS)[number];

type ReminderEvent = {
  uid: string;
  date: string; // YYYY-MM-DD, phone's local time
  time: string; // HH:MM
  minutes: number;
  title: string;
  description: string;
  url?: string;
  weeklyOn?: IcsDay[];
};

const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Long lines must be folded at 75 bytes; continuation lines start with a space.
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const ch of line) {
    if (new TextEncoder().encode(current + ch).length > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
    }
    current += ch;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const stamp = (date: string, time: string) => `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;

function addMinutes(date: string, time: string, minutes: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const end = new Date(y, m - 1, d, hh, mm + minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}T${pad(end.getHours())}${pad(end.getMinutes())}00`;
}

export function buildIcs(e: ReminderEvent): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DesiTadka//Reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@desitadka`,
    `DTSTAMP:${now}`,
    // No time zone on purpose: "floating" time means 6 pm wherever the phone is.
    `DTSTART:${stamp(e.date, e.time)}`,
    `DTEND:${addMinutes(e.date, e.time, e.minutes)}`,
    ...(e.weeklyOn?.length ? [`RRULE:FREQ=WEEKLY;BYDAY=${e.weeklyOn.join(",")}`] : []),
    `SUMMARY:${escapeText(e.title)}`,
    `DESCRIPTION:${escapeText(e.description)}`,
    ...(e.url ? [`URL:${e.url}`] : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(e.title)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
