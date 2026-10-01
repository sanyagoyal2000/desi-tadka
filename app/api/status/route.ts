import { getProvider } from "@/lib/ai";

// Lets Home show a setup banner when no AI backend is configured.
export async function GET() {
  const provider = getProvider();
  return Response.json({ configured: provider !== null, mode: provider?.name ?? null });
}
