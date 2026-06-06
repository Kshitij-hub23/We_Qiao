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
});

export type ParsedCheckRequest = z.infer<typeof checkRequestSchema>;

/** Body for /api/standardize: the confirmed free-text the user reviewed. */
export const standardizeBodySchema = z.object({
  text: z.string().max(20_000),
});
