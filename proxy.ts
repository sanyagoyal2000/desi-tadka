import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, accessToken } from "@/lib/access";

// When ACCESS_CODE is set (on the server), everything except /unlock needs the access cookie,
// so strangers with the link can't use the app or spend the OpenAI credits. Locally it's off.
export async function proxy(request: NextRequest) {
  const code = process.env.ACCESS_CODE;
  if (!code) return NextResponse.next();
  if (request.cookies.get(ACCESS_COOKIE)?.value === (await accessToken(code))) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) return Response.json({ error: "Enter the access code first." }, { status: 401 });
  const unlock = new URL("/unlock", request.url);
  unlock.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(unlock);
}

export const config = {
  matcher: ["/((?!unlock|api/unlock|_next/static|_next/image|favicon.ico).*)"],
};
