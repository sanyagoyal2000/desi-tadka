"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDraft } from "@/lib/draft";

type Extracted = { id: string; sourceUrl: string; caption: string; frames: string[] };

export default function ConvertPage() {
  const router = useRouter();
  const draft = useDraft<Extracted>();

  useEffect(() => {
    if (draft === null) router.replace("/");
  }, [draft, router]);

  if (!draft) return null;
  return (
    <main className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {draft.frames.map((f) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={f} src={f} alt="Frame from the reel" className="aspect-[9/16] w-full rounded-2xl object-cover" />
        ))}
      </div>
      <pre className="whitespace-pre-wrap rounded-3xl bg-white p-4 text-sm">{draft.caption || "(no caption)"}</pre>
    </main>
  );
}
