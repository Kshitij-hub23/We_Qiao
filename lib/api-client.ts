import type {
  CheckRequest,
  CheckResult,
  ConflictDetail,
  OcrResult,
  StandardizeResult,
  StandardizedMedicines,
} from "./types";

/**
 * The ONLY data seam the UI imports. Components never call fetch directly, so
 * when extraction/OCR or other endpoints land later we extend this file and the
 * components stay untouched.
 */

/** Thrown for any non-success path; carries a user-presentable message. */
export class ApiError extends Error {}

/** Send the confirmed Western + Chinese lists to our proxy; get conflicts back. */
export async function checkConflicts(req: CheckRequest): Promise<ConflictDetail[]> {
  let res: Response;
  try {
    res = await fetch("/api/conflicts/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  } catch {
    throw new ApiError("Could not reach the app server. Check your connection and try again.");
  }

  let data: CheckResult;
  try {
    data = (await res.json()) as CheckResult;
  } catch {
    throw new ApiError("The server returned an unexpected response.");
  }

  if (!data.ok) {
    throw new ApiError(data.error);
  }
  return data.conflicts;
}

/** Upload a prescription image to our proxy; get back the transcribed text. */
export async function ocrImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);

  let res: Response;
  try {
    res = await fetch("/api/ocr", { method: "POST", body: form });
  } catch {
    throw new ApiError("Could not reach the app server. Check your connection and try again.");
  }

  let data: OcrResult;
  try {
    data = (await res.json()) as OcrResult;
  } catch {
    throw new ApiError("The server returned an unexpected response.");
  }

  if (!data.ok) throw new ApiError(data.error);
  return data.text;
}

/** Send confirmed text to our proxy; get back split DB-canonical medicine lists. */
export async function standardizeText(text: string): Promise<StandardizedMedicines> {
  let res: Response;
  try {
    res = await fetch("/api/standardize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    throw new ApiError("Could not reach the app server. Check your connection and try again.");
  }

  let data: StandardizeResult;
  try {
    data = (await res.json()) as StandardizeResult;
  } catch {
    throw new ApiError("The server returned an unexpected response.");
  }

  if (!data.ok) throw new ApiError(data.error);
  return data.medicines;
}

/** Lightweight liveness check for the connection indicator. */
export async function getEngineHealth(): Promise<boolean> {
  try {
    const res = await fetch("/api/engine/health", { cache: "no-store" });
    const data = (await res.json()) as { connected: boolean };
    return Boolean(data.connected);
  } catch {
    return false;
  }
}
