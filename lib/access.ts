// The cookie holds a hash of the access code, never the code itself.
export const ACCESS_COOKIE = "dt_access";

export async function accessToken(code: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`desitadka:${code}`));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Only same-site paths, so /unlock?next=… can't bounce someone to another website.
export const safeNext = (next: unknown) => (typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/");
