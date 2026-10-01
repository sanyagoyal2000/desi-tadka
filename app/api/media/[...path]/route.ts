import { readFile } from "node:fs/promises";
import path from "node:path";
import { MEDIA_DIR } from "@/lib/paths";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export async function GET(_req: Request, ctx: RouteContext<"/api/media/[...path]">) {
  const parts = (await ctx.params).path;
  const file = path.join(MEDIA_DIR, ...parts);
  if (!file.startsWith(MEDIA_DIR + path.sep)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(file);
    return new Response(data, {
      headers: { "Content-Type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
