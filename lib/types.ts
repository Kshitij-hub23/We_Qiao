/**
 * Shared types — mirror the external HDI engine contract 1:1.
 * Source of truth: the `engine` branch (`hdi-api/`), endpoint
 * POST /api/v1/check-conflicts. Do not add fields the engine does not return.
 */

export type Severity = "contraindicated" | "major" | "moderate" | "minor";

/** Request body the engine expects: two lists of medicine names, already split. */
export interface CheckRequest {
  western_medicines: string[];
  eastern_medicines: string[];
}

/** A single detected interaction, exactly as the engine returns it. */
export interface ConflictDetail {
  western_drug: string;
  tcm_herb: string;
  severity: Severity;
  mechanism: string;
}

/** Shape our /api/conflicts/check route returns to the browser. */
export type CheckResult =
  | { ok: true; conflicts: ConflictDetail[] }
  | { ok: false; error: string };
