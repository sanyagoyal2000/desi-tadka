import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { MEDIA_DIR, TMP_DIR, mediaUrl } from "./paths";

const run = promisify(execFile);

export class ReelInaccessibleError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "ReelInaccessibleError";
  }
}

export type ReelContent = {
  caption: string;
  frameFiles: string[]; // absolute paths, for the AI
  frameUrls: string[]; // browser URLs, for the card
};

const FRAME_COUNT = 5;

// Downloads the reel with yt-dlp, reads its caption, and saves evenly spaced frames with ffmpeg.
export async function extractReel(url: string, id: string): Promise<ReelContent> {
  await mkdir(TMP_DIR, { recursive: true });
  const outDir = path.join(MEDIA_DIR, id);
  await mkdir(outDir, { recursive: true });

  const args = ["--no-playlist", "--write-info-json", "--socket-timeout", "20", "-f", "mp4/best", "-o", path.join(TMP_DIR, `${id}.%(ext)s`)];
  if (process.env.YTDLP_COOKIES_BROWSER) args.push("--cookies-from-browser", process.env.YTDLP_COOKIES_BROWSER);
  args.push(url);

  try {
    await run(process.env.YTDLP_PATH || "yt-dlp", args, { timeout: 120_000 });
  } catch (err) {
    await rm(outDir, { recursive: true, force: true });
    throw new ReelInaccessibleError(String((err as { stderr?: string }).stderr || err).slice(-400));
  }

  const files = await readdir(TMP_DIR);
  const video = files.find((f) => f.startsWith(`${id}.`) && !f.endsWith(".json"));
  const infoFile = files.find((f) => f === `${id}.info.json`);
  if (!video) {
    await rm(outDir, { recursive: true, force: true });
    throw new ReelInaccessibleError("No video found in this post.");
  }
  const videoPath = path.join(TMP_DIR, video);

  let caption = "";
  let duration = 0;
  if (infoFile) {
    const info = JSON.parse(await readFile(path.join(TMP_DIR, infoFile), "utf8"));
    caption = String(info.description || info.title || "");
    if (Number(info.duration) > 0) duration = Number(info.duration);
  }
  if (!duration) duration = await probeDuration(videoPath);

  // One frame every duration/FRAME_COUNT seconds, starting slightly in to skip black intro frames.
  const fps = FRAME_COUNT / Math.max(duration, 1);
  await run(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-ss", "0.5", "-i", videoPath, "-vf", `fps=${fps},scale=720:-2`, "-frames:v", String(FRAME_COUNT), "-q:v", "4", path.join(outDir, "frame-%d.jpg")],
    { timeout: 120_000 },
  );

  const frames = (await readdir(outDir)).filter((f) => /^frame-\d+\.jpg$/.test(f)).sort((a, b) => parseInt(a.slice(6)) - parseInt(b.slice(6)));
  return {
    caption,
    frameFiles: frames.map((f) => path.join(outDir, f)),
    frameUrls: frames.map((f) => mediaUrl(id, f)),
  };
}

async function probeDuration(file: string): Promise<number> {
  try {
    const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
    return Number(stdout.trim()) || 15;
  } catch {
    return 15;
  }
}
