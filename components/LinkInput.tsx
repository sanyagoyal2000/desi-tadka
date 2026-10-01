"use client";

import { useState } from "react";
import { isValidReelLink } from "@/lib/validateLink";
import { STEP_LABELS, type ExtractStep } from "@/lib/progress";

const looksLikeLink = (s: string) => /^https?:\/\/|instagram\.com/i.test(s.trim());

type Props = {
  busy: boolean;
  step: ExtractStep | null;
  mode: "reel" | "idea";
  onSubmitLink: (url: string) => void;
  onSubmitIdea: (idea: string) => void;
  onSubmitCaption: (caption: string) => void;
  error: string | null;
  showCaptionFallback: boolean;
};

export default function LinkInput({ busy, step, mode, onSubmitLink, onSubmitIdea, onSubmitCaption, error, showCaptionFallback }: Props) {
  const [link, setLink] = useState("");
  const [caption, setCaption] = useState("");
  const isLink = looksLikeLink(link);
  const wrongLink = isLink && !isValidReelLink(link);

  return (
    <div className="rounded-3xl bg-surface p-4 shadow-[0_8px_30px_rgba(42,26,16,0.08)]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (wrongLink || !link.trim()) return;
          if (isLink) onSubmitLink(link.trim());
          else onSubmitIdea(link.trim());
        }}
      >
        <label htmlFor="reel" className="font-display text-lg font-bold">
          Share your ideas
        </label>
        <p className="text-sm text-ink/60">Paste an Instagram reel link, or just type what you&apos;re craving — we&apos;ll give it some desi tadka.</p>
        <div className="mt-2 flex gap-2">
          <input
            id="reel"
            autoComplete="off"
            enterKeyHint="go"
            placeholder="Reel link or “paneer breakfast”"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className={`min-w-0 flex-1 rounded-2xl border-2 bg-cream px-4 py-3 text-base outline-none focus:border-turmeric ${wrongLink ? "border-chili" : "border-transparent"}`}
          />
          <button
            type="submit"
            disabled={busy || wrongLink || !link.trim()}
            className="rounded-2xl bg-chili px-5 py-3 font-display text-lg font-bold text-white disabled:opacity-40"
          >
            {busy ? "…" : "Go"}
          </button>
        </div>
        {wrongLink && <p className="mt-2 text-sm font-semibold text-chili">That isn&apos;t an Instagram reel link.</p>}
        {error && !wrongLink && <p className="mt-2 text-sm font-semibold text-chili">{error}</p>}
        {busy && <Progress step={step} mode={mode} />}
      </form>

      {showCaptionFallback && (
        <form
          className="mt-4 border-t border-cream pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (caption.trim()) onSubmitCaption(caption.trim());
          }}
        >
          <label htmlFor="caption" className="text-sm font-semibold">
            Paste the caption instead
          </label>
          <textarea
            id="caption"
            rows={4}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Copy the reel's caption from Instagram and paste it here"
            className="mt-2 w-full rounded-2xl border-2 border-transparent bg-cream px-4 py-3 text-base outline-none focus:border-turmeric"
          />
          <button type="submit" disabled={busy || !caption.trim()} className="mt-2 w-full rounded-2xl bg-turmeric py-3 font-display text-lg font-bold text-white disabled:opacity-40">
            Use caption
          </button>
        </form>
      )}
    </div>
  );
}

const ORDER: ExtractStep[] = ["read", "write", "plate"];

// Live steps from /api/extract: done ✓, current pulsing, upcoming dimmed.
function Progress({ step, mode }: { step: ExtractStep | null; mode: "reel" | "idea" }) {
  const current = step ? ORDER.indexOf(step) : 0;
  return (
    <ol aria-live="polite" className="mt-3 flex items-center gap-2 text-xs font-semibold">
      {ORDER.map((s, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li key={s} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true" className={`h-px w-4 ${i <= current ? "bg-turmeric" : "bg-ink/20"}`} />}
            <span
              aria-current={state === "active" ? "step" : undefined}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${
                state === "done" ? "bg-turmeric-soft text-turmeric" : state === "active" ? "animate-pulse bg-chili text-white" : "bg-cream text-ink/40"
              }`}
            >
              {state === "done" && <span aria-hidden="true">✓</span>}
              {STEP_LABELS[mode][s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
