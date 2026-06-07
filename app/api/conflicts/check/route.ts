import { NextResponse } from "next/server";
import { checkRequestSchema } from "@/lib/validation";
import { checkConflicts, EngineUnavailableError } from "@/lib/engine";
import type { CheckResult, ConflictDetail } from "@/lib/types";

/**
 * The single integration point with the teammate's engine.
 * Validates the body, forwards the two name lists, and returns the conflicts.
 * Runs on Node (not edge) so it can reach a localhost service.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse<CheckResult>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = checkRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request shape." }, { status: 400 });
  }

  // `view` is a viewer concern, not part of the engine contract — keep it here.
  const { view, ...engineRequest } = parsed.data;

  try {
    const conflicts = await checkConflicts(engineRequest);
    // Role-based projection: clinicians get the full sourced record; everyone
    // else gets severity + the pair only. Stripping here means the clinical
    // detail never reaches a non-clinician's browser.
    const projected: ConflictDetail[] =
      view === "clinical"
        ? conflicts
        : conflicts.map((c) => ({
            western_drug: c.western_drug,
            tcm_herb: c.tcm_herb,
            severity: c.severity,
          }));
    return NextResponse.json({ ok: true, conflicts: projected });
  } catch (err) {
    if (err instanceof EngineUnavailableError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { ok: false, error: "Unexpected error contacting the conflict engine." },
      { status: 500 },
    );
  }
}
