"use client";

import { useState } from "react";
import { isValidReelLink } from "@/lib/validateLink";

type Props = {
  busy: boolean;
  onSubmitLink: (url: string) => void;
  onSubmitCaption: (caption: string) => void;
  error: string | null;
  showCaptionFallback: boolean;
};

export default function LinkInput({ busy, onSubmitLink, onSubmitCaption, error, showCaptionFallback }: Props) {
  const [link, setLink] = useState("");
  const [caption, setCaption] = useState("");
  const wrongLink = link.trim() !== "" && !isValidReelLink(link);

  return (
    <div className="rounded-3xl bg-white p-4 shadow-[0_8px_30px_rgba(42,26,16,0.08)]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!wrongLink && link.trim()) onSubmitLink(link.trim());
        }}
      >
        <label htmlFor="reel" className="font-display text-lg font-bold">
          Paste an Instagram reel
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="reel"
            inputMode="url"
            autoComplete="off"
            placeholder="https://www.instagram.com/reel/…"
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
        {wrongLink && <p className="mt-2 text-sm font-semibold text-chili">Wrong link</p>}
        {error && !wrongLink && <p className="mt-2 text-sm font-semibold text-chili">{error}</p>}
        {busy && <p className="mt-2 animate-pulse text-sm font-semibold text-turmeric">Adding tadka… reading the reel, this can take a minute.</p>}
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
