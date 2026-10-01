// Plan dates are local calendar days written as "YYYY-MM-DD".
const pad = (n: number) => String(n).padStart(2, "0");

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export const todayISO = () => toISO(new Date());

// Weeks start on Monday.
export const weekStart = (iso: string) => addDays(iso, -((fromISO(iso).getDay() + 6) % 7));

export const weekDates = (start: string) => Array.from({ length: 7 }, (_, i) => addDays(start, i));

export function dayLabel(iso: string) {
  const d = fromISO(iso);
  return {
    short: d.toLocaleDateString("en-IN", { weekday: "short" }),
    long: d.toLocaleDateString("en-IN", { weekday: "long" }),
    date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    dayOfMonth: d.getDate(),
  };
}

export const weekRange = (start: string) => `${dayLabel(start).date} – ${dayLabel(addDays(start, 6)).date}`;
