import { NextResponse } from "next/server";
import { standardizeBodySchema } from "@/lib/validation";
import { standardizeText, IntakeUnavailableError } from "@/lib/intake";
import type { StandardizeResult } from "@/lib/types";

/**
 * Receives the user-confirmed free text and forwards it to the Python intake
 * service, which maps it onto the database vocabulary (split WM / TCM).
 * Runs on Node (not edge) so it can reach a localhost service.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse<StandardizeResult>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = standardizeBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request shape." }, { status: 400 });
  }

  if (!parsed.data.text.trim()) {
    // Nothing to standardize — short-circuit with empty lists.
    return NextResponse.json({
      ok: true,
      medicines: { western_medicines: [], eastern_medicines: [] },
    });
  }

  try {
    const medicines = await standardizeText(parsed.data.text);
    return NextResponse.json({ ok: true, medicines });
  } catch (err) {
    if (err instanceof IntakeUnavailableError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { ok: false, error: "Unexpected error while standardizing the medicines." },
      { status: 500 },
    );
  }
}
