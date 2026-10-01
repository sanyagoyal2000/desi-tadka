import path from "node:path";

export const ROOT = process.cwd();
export const DATA_DIR = path.join(ROOT, "data");
export const MEDIA_DIR = path.join(DATA_DIR, "media");
export const TMP_DIR = path.join(ROOT, "tmp");

// Media files live on disk under data/media and are served by app/api/media/[...path].
export function mediaUrl(id: string, file: string): string {
  return `/api/media/${id}/${file}`;
}

export function mediaPathFromUrl(url: string): string | null {
  const m = url.match(/^\/api\/media\/([\w-]+)\/([\w.-]+)$/);
  return m ? path.join(MEDIA_DIR, m[1], m[2]) : null;
}

export function newId(prefix = "card"): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
