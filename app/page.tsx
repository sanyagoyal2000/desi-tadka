"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LinkInput from "@/components/LinkInput";
import { clearDraft, saveDraft } from "@/lib/draft";

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCaptionFallback, setShowCaptionFallback] = useState(false);

  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    clearDraft();
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => setConfigured(Boolean(s.configured)))
      .catch(() => {});
  }, []);

  async function extract(payload: { url?: string; caption?: string }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        if (data.inaccessible) setShowCaptionFallback(true);
        return;
      }
      saveDraft(data);
      router.push("/convert");
    } catch {
      setError("Couldn't reach DesiTadka. Is the dev server running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-col gap-6">
      {!configured && (
        <p className="rounded-2xl bg-chili px-4 py-3 text-sm font-semibold text-white">Add an OpenAI key or Codex path in .env.local.</p>
      )}
      <LinkInput
        busy={busy}
        error={error}
        showCaptionFallback={showCaptionFallback}
        onSubmitLink={(url) => extract({ url })}
        onSubmitCaption={(caption) => extract({ caption })}
      />
    </main>
  );
}
