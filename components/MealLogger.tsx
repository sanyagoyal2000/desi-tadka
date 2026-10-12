/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle, Minus, PaperPlaneRight, Plus, X } from "@phosphor-icons/react/dist/ssr";
import type { FoodItem, MealEntry } from "@/lib/schema";
import { mealTotals } from "@/lib/fitness";
import { postEntry, shrinkPhoto } from "@/lib/todayClient";

type Scan = { id: string; title: string; photo: string; items: FoodItem[] };

const SCAN_LINES = ["Spotting katoris…", "Counting rotis…", "Checking the ghee…", "Estimating protein…"];

// Snap a thali (or type "2 roti, dal, sabzi") → AI lists items in Indian portions → fix counts → log.
export default function MealLogger({ date, onLogged }: { date: string; onLogged: (entry: MealEntry) => void }) {
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [line, setLine] = useState(0);
  const [scan, setScan] = useState<Scan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!scanning) return;
    const t = setInterval(() => setLine((n) => (n + 1) % SCAN_LINES.length), 1400);
    return () => clearInterval(t);
  }, [scanning]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function run(photo: File | null, text: string) {
    setError(null);
    setScan(null);
    setScanning(true);
    setLine(0);
    const form = new FormData();
    if (photo) {
      setPreview(URL.createObjectURL(photo));
      form.append("photo", await shrinkPhoto(photo), "plate.jpg");
    } else setPreview(null);
    if (text.trim()) form.append("note", text.trim());
    try {
      const res = await fetch("/api/meal/scan", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!data.items?.length) throw new Error("I couldn't spot any food there. Try another photo or type it.");
      setScan(data);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't read that meal. Try again.");
    } finally {
      setScanning(false);
    }
  }

  function setCount(i: number, delta: number) {
    setScan((s) => s && { ...s, items: s.items.map((it, n) => (n === i ? { ...it, count: Math.max(0, Math.round((it.count + delta) * 2) / 2) } : it)) });
  }

  async function save() {
    if (!scan) return;
    setSaving(true);
    const entry: MealEntry = {
      kind: "meal",
      id: scan.id,
      at: new Date().toISOString(),
      title: scan.title,
      photo: scan.photo,
      items: scan.items.filter((i) => i.count > 0),
    };
    if (await postEntry(date, entry)) {
      onLogged(entry);
      reset();
    } else setError("Couldn't save. Try again.");
    setSaving(false);
  }

  function reset() {
    setScan(null);
    setPreview(null);
    setNote("");
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const totals = scan && mealTotals(scan.items);

  return (
    <section aria-labelledby="log-heading" className="rounded-3xl bg-surface p-4 shadow-[0_4px_16px_rgba(24,12,80,0.06)]">
      <h2 id="log-heading" className="font-display text-xl font-extrabold">
        Log a meal
      </h2>

      {!scan && !scanning && (
        <>
          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-volt py-4 font-display text-lg font-bold text-white focus-within:outline-2 focus-within:outline-electric">
            <Camera aria-hidden="true" size={24} weight="fill" /> Snap your plate
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) run(f, note);
              }}
            />
          </label>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (note.trim()) run(null, note);
            }}
          >
            <label htmlFor="meal-note" className="sr-only">
              Or type what you ate
            </label>
            <input
              id="meal-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="or type: 3 roti, dal, bhindi"
              className="min-w-0 flex-1 rounded-2xl bg-canvas px-4 py-3 text-base outline-none focus:ring-2 focus:ring-electric"
            />
            <button type="submit" disabled={!note.trim()} aria-label="Log typed meal" className="grid size-12 place-items-center rounded-2xl bg-electric text-white disabled:opacity-40">
              <PaperPlaneRight aria-hidden="true" size={20} weight="fill" />
            </button>
          </form>
        </>
      )}

      {scanning && (
        <div className="mt-3" role="status" aria-live="polite">
          {preview ? (
            <div className="relative overflow-hidden rounded-2xl">
              <img src={preview} alt="Your plate" className="aspect-[4/3] w-full object-cover" />
              <div className="scan-line absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-electric/50 to-transparent" />
            </div>
          ) : (
            <div className="h-24 animate-pulse rounded-2xl bg-canvas" />
          )}
          <p className="mt-2 text-center text-sm font-semibold text-ink/70">{SCAN_LINES[line]}</p>
        </div>
      )}

      {scan && totals && (
        <div className="mt-3">
          <div className="flex items-center gap-3">
            {scan.photo && <img src={scan.photo} alt="" className="size-16 shrink-0 rounded-2xl object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-bold">{scan.title}</p>
              <p className="text-sm text-ink/60">
                <span className="font-bold text-volt">{Math.round(totals.calories)} kcal</span> ·{" "}
                <span className="font-bold text-aqua">{Math.round(totals.proteinGrams)} g protein</span>
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink/50">Fix anything I counted wrong:</p>
          <ul className="mt-1 flex flex-col gap-1.5">
            {scan.items.map((it, i) => (
              <li key={i} className={`flex items-center gap-2 rounded-2xl bg-canvas px-3 py-2 ${it.count === 0 ? "opacity-40" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{it.name}</p>
                  <p className="truncate text-xs text-ink/60">
                    {it.portion} · {Math.round(it.calories * it.count)} kcal · {Math.round(it.proteinGrams * it.count)} g
                  </p>
                </div>
                <button type="button" onClick={() => setCount(i, -0.5)} aria-label={`Less ${it.name}`} className="grid size-9 place-items-center rounded-full bg-surface text-volt">
                  <Minus aria-hidden="true" size={14} weight="bold" />
                </button>
                <span className="w-8 text-center font-display text-lg font-bold tabular-nums">{it.count}</span>
                <button type="button" onClick={() => setCount(i, 0.5)} aria-label={`More ${it.name}`} className="grid size-9 place-items-center rounded-full bg-surface text-volt">
                  <Plus aria-hidden="true" size={14} weight="bold" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
            <button type="button" onClick={reset} aria-label="Discard" className="grid size-12 place-items-center rounded-2xl bg-canvas text-ink/60">
              <X aria-hidden="true" size={18} weight="bold" />
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || totals.calories === 0}
              className="flex items-center justify-center gap-2 rounded-2xl bg-volt font-display text-lg font-bold text-white disabled:opacity-50"
            >
              <CheckCircle aria-hidden="true" size={22} weight="fill" /> {saving ? "Saving…" : "Add to today"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-blaze">
          {error}
        </p>
      )}
    </section>
  );
}
