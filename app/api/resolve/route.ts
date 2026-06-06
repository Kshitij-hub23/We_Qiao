import { NextResponse } from "next/server";
import { resolveBodySchema } from "@/lib/validation";
import { extractMedicines, IntakeUnavailableError } from "@/lib/intake";
import { resolveCandidates, EngineUnavailableError } from "@/lib/engine";
import type { ResolveResult } from "@/lib/types";

/**
 * Intake matching step. Takes the user-confirmed free text and runs the two
 * halves of the fuzzy→deterministic pipeline:
 *   1. EXTRACT  — the intake service (Gemini) returns candidate name strings.
 *   2. RESOLVE  — the engine deterministically maps candidates → dataset
 *                 entities (exact alias + fuzzy fallback). This is the safety
 *                 boundary; the LLM never decides identity.
 * Returns matched entities (with confidence) + the names nothing matched.
 * Runs on Node (not edge) so it can reach the localhost services.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse<ResolveResult>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = resolveBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request shape." }, { status: 400 });
  }

  if (!parsed.data.text.trim()) {
    return NextResponse.json({ ok: true, matched: [], unmatched: [] });
  }

  try {
    const candidates = await extractMedicines(parsed.data.text);
    if (candidates.length === 0) {
      return NextResponse.json({ ok: true, matched: [], unmatched: [] });
    }
    const { matched, unmatched } = await resolveCandidates(candidates);
    return NextResponse.json({ ok: true, matched, unmatched });
  } catch (err) {
    if (err instanceof IntakeUnavailableError || err instanceof EngineUnavailableError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { ok: false, error: "Unexpected error while resolving the medicines." },
      { status: 500 },
    );
  }
}
