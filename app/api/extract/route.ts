import { parseReelLink } from "@/lib/validateLink";
import { extractReel, ReelInaccessibleError } from "@/lib/reel";
import { newId } from "@/lib/paths";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { url?: string; caption?: string };
  const id = newId();

  if (body.url) {
    const link = parseReelLink(body.url);
    if (!link) return Response.json({ error: "Wrong link" }, { status: 400 });
    try {
      const reel = await extractReel(link.url, id);
      return Response.json({ id, sourceUrl: link.url, caption: reel.caption, frames: reel.frameUrls });
    } catch (err) {
      if (err instanceof ReelInaccessibleError) {
        console.error("[extract] inaccessible:", err.message);
        return Response.json({ error: "Unable to access, please check", inaccessible: true }, { status: 422 });
      }
      throw err;
    }
  }

  if (body.caption?.trim()) {
    return Response.json({ id, sourceUrl: "", caption: body.caption.trim(), frames: [] });
  }
  return Response.json({ error: "Paste a reel link or a caption" }, { status: 400 });
}
