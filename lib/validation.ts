import { z } from "zod";

/**
 * Validation for the inbound /api/conflicts/check body. We accept the engine's
 * own field names so the proxy stays a thin pass-through. Names are trimmed and
 * empties dropped before they reach the engine.
 */
const nameList = z
  .array(z.string())
  .default([])
  .transform((arr) => arr.map((s) => s.trim()).filter(Boolean));

export const checkRequestSchema = z.object({
  western_medicines: nameList,
  eastern_medicines: nameList,
  // Viewer-driven detail level. Defaults to the safe minimum so anything that
  // doesn't explicitly request the clinician view only gets severity.
  view: z.enum(["summary", "clinical"]).default("summary"),
});

export type ParsedCheckRequest = z.infer<typeof checkRequestSchema>;

/** Body for /api/resolve: the confirmed free-text the user reviewed. */
export const resolveBodySchema = z.object({
  text: z.string().max(20_000),
});
