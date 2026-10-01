import { ACCESS_COOKIE, accessToken, safeNext } from "@/lib/access";

// Form post from /unlock: right code → remember this browser for a year and go back where you were.
export async function POST(req: Request) {
  const form = await req.formData();
  const next = safeNext(form.get("next"));
  const code = process.env.ACCESS_CODE;
  const base = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? base.protocol.replace(":", "");
  const origin = `${proto}://${req.headers.get("host") ?? base.host}`;

  if (!code || form.get("code") !== code) {
    return Response.redirect(`${origin}/unlock?${new URLSearchParams({ next, wrong: "1" })}`, 303);
  }
  const cookie = [
    `${ACCESS_COOKIE}=${await accessToken(code)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${60 * 60 * 24 * 365}`,
    ...(proto === "https" ? ["Secure"] : []),
  ].join("; ");
  return new Response(null, { status: 303, headers: { Location: `${origin}${next}`, "Set-Cookie": cookie } });
}
