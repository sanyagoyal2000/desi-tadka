import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AIConfigError, scanMeal } from "@/lib/ai";
import { MEDIA_DIR, mediaUrl, newId } from "@/lib/paths";

const MAX_BYTES = 8 * 1024 * 1024;

// multipart { photo?: image (the browser sends a resized JPEG), note?: string }
//   → { id, title, photo, items } — not saved to the log until the user confirms.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const note = String(form?.get("note") ?? "").trim().slice(0, 500);
  const photo = form?.get("photo");
  const file = photo instanceof File && photo.size > 0 ? photo : null;
  if (!file && !note) return Response.json({ error: "Add a photo of your plate or type what you ate." }, { status: 400 });
  if (file && (file.size > MAX_BYTES || !file.type.startsWith("image/"))) return Response.json({ error: "That photo is too big or not an image." }, { status: 400 });

  const id = newId("meal");
  let photoFile: string | undefined;
  if (file) {
    const dir = path.join(MEDIA_DIR, id);
    await mkdir(dir, { recursive: true });
    photoFile = path.join(dir, "plate.jpg");
    await writeFile(photoFile, Buffer.from(await file.arrayBuffer()));
  }

  try {
    const scan = await scanMeal(note, photoFile);
    return Response.json({ id, title: scan.title, photo: photoFile ? mediaUrl(id, "plate.jpg") : "", items: scan.items });
  } catch (err) {
    if (err instanceof AIConfigError) return Response.json({ error: err.message }, { status: 503 });
    return Response.json({ error: "Couldn't read that meal. Try again, or type what you ate." }, { status: 502 });
  }
}
