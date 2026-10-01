"use client";

import type { RoutineItem } from "./schema";

// One shared fetch of data/routine.json per page, so each exercise button doesn't ask separately.
let cache: Promise<RoutineItem[]> | null = null;

export function loadRoutine(): Promise<RoutineItem[]> {
  cache ??= fetch("/api/routine")
    .then((r) => r.json())
    .then((d) => d.items ?? [])
    .catch(() => []);
  return cache;
}

export function forgetRoutine() {
  cache = null;
}

export const sameMove = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
