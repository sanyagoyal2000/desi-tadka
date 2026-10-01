// Accepts instagram.com/reel/<code>, /reels/<code>, /p/<code> (with or without www, query, trailing slash).
const REEL_PATTERN = /^https?:\/\/(?:www\.|m\.)?instagram\.com\/(?:[\w.]+\/)?(?:reels?|p)\/([\w-]+)\/?(?:[?#].*)?$/i;

export function parseReelLink(input: string): { url: string; code: string } | null {
  const match = input.trim().match(REEL_PATTERN);
  if (!match) return null;
  return { url: input.trim(), code: match[1] };
}

export function isValidReelLink(input: string): boolean {
  return parseReelLink(input) !== null;
}
