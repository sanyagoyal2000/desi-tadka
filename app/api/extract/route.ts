import { parseReelLink } from "@/lib/validateLink";
import { extractReel, ReelInaccessibleError } from "@/lib/reel";
import { newId } from "@/lib/paths";
import { AIConfigError, AIResponseError, extractCard } from "@/lib/ai";

// link (or pasted caption) → caption + frames → AI → original recipe/workout card
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { url?: string; caption?: string };
  const id = newId();
  let sourceUrl = "";
  let caption = body.caption?.trim() ?? "";
  let frameFiles: string[] = [];
  let frameUrls: string[] = [];

  if (body.url) {
    const link = parseReelLink(body.url);
    if (!link) return Response.json({ error: "Wrong link" }, { status: 400 });
    try {
      const reel = await extractReel(link.url, id);
      sourceUrl = link.url;
      caption = reel.caption;
      frameFiles = reel.frameFiles;
      frameUrls = reel.frameUrls;
    } catch (err) {
      if (err instanceof ReelInaccessibleError) {
        console.error("[extract] inaccessible:", err.message);
        return Response.json({ error: "Unable to access, please check", inaccessible: true }, { status: 422 });
      }
      throw err;
    }
  } else if (!caption) {
    return Response.json({ error: "Paste a reel link or a caption" }, { status: 400 });
  }

  try {
    const result = await extractCard({ id, sourceUrl, caption, frameFiles, frameUrls });
    if (result.kind === "other") return Response.json({ error: "This doesn't look like a recipe or workout." }, { status: 422 });
    return Response.json(result);
  } catch (err) {
    if (err instanceof AIConfigError) return Response.json({ error: err.message }, { status: 503 });
    if (err instanceof AIResponseError) return Response.json({ error: "Couldn't read this reel, try again." }, { status: 502 });
    throw err;
  }
}
