import { parseReelLink } from "@/lib/validateLink";
import { extractReel, ReelInaccessibleError } from "@/lib/reel";
import { newId } from "@/lib/paths";
import { AIConfigError, AIResponseError, extractCard, ideaToCard, pictureFor } from "@/lib/ai";
import type { ExtractEvent } from "@/lib/progress";

// link, pasted caption, or typed idea → AI → original recipe/workout card.
// Streams NDJSON progress events so the UI can show which step is running.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { url?: string; caption?: string; idea?: string };
  const link = body.url ? parseReelLink(body.url) : null;
  const caption = body.caption?.trim() ?? "";
  const idea = body.idea?.trim() ?? "";

  if (body.url && !link) return Response.json({ error: "Wrong link" }, { status: 400 });
  if (!link && !caption && !idea) return Response.json({ error: "Share a reel link or an idea" }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: ExtractEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        send(await run(send));
      } catch (err) {
        console.error("[extract]", err);
        send({ type: "error", error: "Something went wrong." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });

  async function run(send: (e: ExtractEvent) => void): Promise<ExtractEvent> {
    const id = newId();
    try {
      if (idea) {
        send({ type: "step", step: "read" });
        send({ type: "step", step: "write" });
        const result = await ideaToCard(id, idea);
        if (result.kind === "other") return { type: "error", error: "Try describing a dish or a workout." };
        send({ type: "step", step: "plate" });
        return { type: "done", data: result.kind === "recipe" ? { kind: "recipe", card: await pictureFor(result.card) } : result };
      }

      send({ type: "step", step: "read" });
      let input = { id, sourceUrl: "", caption, frameFiles: [] as string[], frameUrls: [] as string[] };
      if (link) {
        try {
          const reel = await extractReel(link.url, id);
          input = { id, sourceUrl: link.url, caption: reel.caption, frameFiles: reel.frameFiles, frameUrls: reel.frameUrls };
        } catch (err) {
          if (err instanceof ReelInaccessibleError) {
            console.error("[extract] inaccessible:", err.message);
            return { type: "error", error: "Unable to access, please check", inaccessible: true };
          }
          throw err;
        }
      }
      send({ type: "step", step: "write" });
      const result = await extractCard(input);
      if (result.kind === "other") return { type: "error", error: "This doesn't look like a recipe or workout." };
      send({ type: "step", step: "plate" });
      return { type: "done", data: result };
    } catch (err) {
      if (err instanceof AIConfigError) return { type: "error", error: err.message };
      if (err instanceof AIResponseError) return { type: "error", error: "Couldn't read this, try again." };
      throw err;
    }
  }
}
