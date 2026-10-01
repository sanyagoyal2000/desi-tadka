"use client";

import { useMemo, useSyncExternalStore } from "react";

// The in-progress card travels from Home to Convert in sessionStorage; it's discarded unless saved.
const KEY = "desitadka:draft";
const listeners = new Set<() => void>();

export function saveDraft(value: unknown) {
  sessionStorage.setItem(KEY, JSON.stringify(value));
  listeners.forEach((l) => l());
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

// undefined = still on the server / not hydrated yet; null = no draft.
export function useDraft<T>(): T | null | undefined {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => undefined);
  return useMemo(() => {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [raw]);
}
