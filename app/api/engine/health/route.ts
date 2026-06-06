import { NextResponse } from "next/server";
import { engineHealthy } from "@/lib/engine";

/** Proxies the engine /health probe so the UI can show a connection indicator. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<{ connected: boolean }>> {
  const connected = await engineHealthy();
  return NextResponse.json({ connected });
}
