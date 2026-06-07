/**
 * Shared types — mirror the external HDI engine contract 1:1.
 * Source of truth: the `engine` branch (`hdi-api/`), endpoint
 * POST /api/v1/check-conflicts. Do not add fields the engine does not return.
 */

export type Severity = "contraindicated" | "major" | "moderate" | "minor";

/**
 * Who is viewing the conflict, which decides how much detail they get:
 * - "summary"  — patients & caretakers: severity (and the drug pair) only.
 * - "clinical" — practitioners: the full sourced record.
 * The proxy (`/api/conflicts/check`) projects the engine response to this view.
 */
export type ConflictView = "summary" | "clinical";

/** Request body the engine expects: two lists of medicine names, already split. */
export interface CheckRequest {
  western_medicines: string[];
  eastern_medicines: string[];
}

/** One evidence reference backing an interaction (PMID / DOI / DB id, + note). */
export interface Source {
  type?: string;
  ref?: string;
  note?: string;
}

/**
 * A single detected interaction. `western_drug`, `tcm_herb` and `severity` are
 * always present. The clinical fields are present only in the "clinical" view —
 * the proxy strips them for the "summary" view, so they are optional here.
 */
export interface ConflictDetail {
  western_drug: string;
  tcm_herb: string;
  severity: Severity;
  mechanism?: string;
  effect_direction?: string;
  clinical_effect?: string;
  management?: string;
  evidence_level?: string;
  sources?: Source[];
}

/** Shape our /api/conflicts/check route returns to the browser. */
export type CheckResult =
  | { ok: true; conflicts: ConflictDetail[] }
  | { ok: false; error: string };

/* ---- Intake: OCR (intake service) → extract (intake) → resolve (engine) ---- */

/** Shape our /api/ocr route returns to the browser. */
export type OcrResult = { ok: true; text: string } | { ok: false; error: string };

/** Entity type as stored in the dataset. */
export type EntityType = "WM-drug" | "TCM-herb" | "TCM-formula";

/**
 * One extracted candidate name resolved to a dataset entity by the engine's
 * deterministic resolver. `requires_confirmation` is true for fuzzy matches
 * below the high-confidence threshold — these must be confirmed by a human
 * before they enter the conflict check (the resolver is the safety boundary).
 */
export interface ResolvedMatch {
  candidate: string;
  entity_id: string;
  preferred_name: string;
  type: EntityType;
  score: number;
  method: "exact" | "fuzzy";
  requires_confirmation: boolean;
}

/** Result of resolving a free-text intake: matches + names nothing matched. */
export interface ResolveResponse {
  matched: ResolvedMatch[];
  unmatched: string[];
}

/** Shape our /api/resolve route returns to the browser. */
export type ResolveResult =
  | { ok: true; matched: ResolvedMatch[]; unmatched: string[] }
  | { ok: false; error: string };
