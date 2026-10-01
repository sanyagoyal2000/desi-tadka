// Progress events streamed by /api/extract, one JSON object per line.
export type ExtractStep = "read" | "write" | "plate";

export type ExtractEvent =
  | { type: "step"; step: ExtractStep }
  | { type: "done"; data: unknown }
  | { type: "error"; error: string; inaccessible?: boolean };

export const STEP_LABELS: Record<"reel" | "idea", Record<ExtractStep, string>> = {
  reel: { read: "Reading reel", write: "Writing the card", plate: "Plating" },
  idea: { read: "Reading your idea", write: "Writing the card", plate: "Plating" },
};

// Calls /api/extract and reports each step as it arrives.
export async function streamExtract(payload: Record<string, string>, onStep: (s: ExtractStep) => void): Promise<ExtractEvent> {
  const res = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.body || !res.headers.get("Content-Type")?.includes("ndjson")) {
    const data = await res.json().catch(() => ({}));
    return { type: "error", error: data.error ?? "Something went wrong", inaccessible: data.inaccessible };
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let last: ExtractEvent = { type: "error", error: "No response from DesiTadka." };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as ExtractEvent;
      if (event.type === "step") onStep(event.step);
      else last = event;
    }
  }
  return last;
}
