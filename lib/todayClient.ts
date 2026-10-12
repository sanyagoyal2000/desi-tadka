"use client";

import type { Goals, LogEntry } from "./schema";

// Phone photos are 3–12 MB; shrink to a ~1280 px JPEG before upload. If the browser
// can't decode it (e.g. HEIC on desktop Chrome) the original goes up and the server copes.
export async function shrinkPhoto(file: File, maxSide = 1280): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

export async function fetchDay(date: string): Promise<LogEntry[]> {
  const res = await fetch(`/api/log?${new URLSearchParams({ date })}`);
  if (!res.ok) throw new Error("log");
  return (await res.json()).entries ?? [];
}

export async function fetchGoals(): Promise<Goals> {
  const res = await fetch("/api/goals");
  if (!res.ok) throw new Error("goals");
  return (await res.json()).goals;
}

export async function postEntry(date: string, entry: LogEntry): Promise<boolean> {
  const res = await fetch("/api/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, entry }) }).catch(() => null);
  return Boolean(res?.ok);
}
