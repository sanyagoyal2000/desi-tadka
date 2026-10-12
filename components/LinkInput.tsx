"use client";

import { useState } from "react";
import { isValidReelLink } from "@/lib/validateLink";
import { STEP_LABELS, type ExtractStep } from "@/lib/progress";
import { Check, FilmStrip, PencilSimpleLine } from "@phosphor-icons/react/dist/ssr";

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
  const [source, setSource] = useState<"reel" | "idea">("reel");
  const [link, setLink] = useState("");
  const [idea, setIdea] = useState("");
  const [caption, setCaption] = useState("");
  const wrongLink = source === "reel" && link.trim() !== "" && !isValidReelLink(link);
  const value = source === "reel" ? link : idea;

  return (
    <div className="rounded-3xl bg-surface p-4 shadow-[0_8px_30px_rgba(24,12,80,0.08)]">
      <div role="tablist" aria-label="What are you adding?" className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-canvas p-1">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={source === s.id}
            onClick={() => setSource(s.id)}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-electric ${
              source === s.id ? "bg-volt text-white shadow" : "text-ink/60 hover:text-ink"
            }`}
          >
            <s.Icon aria-hidden="true" size={18} weight="bold" />
            {s.label}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (wrongLink || !value.trim()) return;
          if (source === "reel") onSubmitLink(link.trim());
          else onSubmitIdea(idea.trim());
        }}
      >
        <label htmlFor="reel" className="font-display text-lg font-bold">
          {source === "reel" ? "Paste an Instagram reel" : "Type a recipe or workout idea"}
        </label>
        <p className="text-sm text-ink/60">
          {source === "reel"
            ? "Recipe or fitness reel we’ll turn it into a personalized memory."
            : "Say what you’re craving or want to train we’ll give it some desi tadka."}
        </p>
        <div className="mt-2 flex gap-2">
          <input
            id="reel"
            key={source}
            inputMode={source === "reel" ? "url" : "text"}
            autoComplete="off"
            enterKeyHint="go"
            placeholder={source === "reel" ? "https://www.instagram.com/reel/…" : "“paneer breakfast” or “20 min leg workout”"}
            value={value}
            onChange={(e) => (source === "reel" ? setLink : setIdea)(e.target.value)}
            className={`min-w-0 flex-1 rounded-2xl border-2 bg-canvas px-4 py-3 text-base outline-none focus:border-electric ${wrongLink ? "border-blaze" : "border-transparent"}`}
          />
          <button
            type="submit"
            disabled={busy || wrongLink || !value.trim()}
            className="rounded-2xl bg-volt px-5 py-3 font-display text-lg font-bold text-white disabled:opacity-40"
          >
            {busy ? "…" : "Go"}
          </button>
        </div>
        {wrongLink && <p className="mt-2 text-sm font-semibold text-blaze">Wrong link</p>}
        {error && !wrongLink && <p className="mt-2 text-sm font-semibold text-blaze">{error}</p>}
        {busy && <Progress step={step} mode={mode} />}
      </form>

      {showCaptionFallback && (
        <form
          className="mt-4 border-t border-canvas pt-4"
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
            className="mt-2 w-full rounded-2xl border-2 border-transparent bg-canvas px-4 py-3 text-base outline-none focus:border-electric"
          />
          <button type="submit" disabled={busy || !caption.trim()} className="mt-2 w-full rounded-2xl bg-electric py-3 font-display text-lg font-bold text-white disabled:opacity-40">
            Use caption
          </button>
        </form>
      )}
    </div>
  );
}

const SOURCES = [
  { id: "reel", label: "Reel link", Icon: FilmStrip },
  { id: "idea", label: "Type an idea", Icon: PencilSimpleLine },
] as const;

const ORDER: ExtractStep[] = ["read", "write", "plate"];

// Live steps from /api/extract: done (check), current pulsing, upcoming dimmed.
function Progress({ step, mode }: { step: ExtractStep | null; mode: "reel" | "idea" }) {
  const current = step ? ORDER.indexOf(step) : 0;
  return (
    <ol aria-live="polite" className="mt-3 flex items-center gap-2 text-xs font-semibold">
      {ORDER.map((s, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li key={s} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true" className={`h-px w-4 ${i <= current ? "bg-electric" : "bg-ink/20"}`} />}
            <span
              aria-current={state === "active" ? "step" : undefined}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${
                state === "done" ? "bg-electric-soft text-electric" : state === "active" ? "animate-pulse bg-volt text-white" : "bg-canvas text-ink/40"
              }`}
            >
              {state === "done" && <Check aria-hidden="true" size={12} weight="bold" />}
              {STEP_LABELS[mode][s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
