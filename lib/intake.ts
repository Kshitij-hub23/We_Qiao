/**
 * Server-side wrapper around the external Python *intake* service (OCR +
 * extract). The base URL lives only here (and in env) so the browser never
 * talks to Gemini directly and the API key stays server-side — same pattern as
 * `engine.ts`. The intake service only extracts candidate names; resolving them
 * to entities is the engine's job (`lib/engine.ts` → `/api/v1/resolve`).
 */

const INTAKE_URL = process.env.INTAKE_URL ?? "http://127.0.0.1:8001";
// OCR involves a vision model call (+ retries), so allow a generous timeout.
const TIMEOUT_MS = 45_000;

/** Raised when the intake service is unreachable, times out, or errors. */
export class IntakeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntakeUnavailableError";
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Forward an uploaded image to the intake service; get back transcribed text. */
export async function ocrImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file, file.name || "upload");

  let res: Response;
  try {
    res = await fetchWithTimeout(`${INTAKE_URL}/api/v1/ocr`, {
      method: "POST",
      body: form,
      cache: "no-store",
    });
  } catch (err) {
    const reason =
      err instanceof Error && err.name === "AbortError" ? "timed out" : "could not be reached";
    throw new IntakeUnavailableError(`The intake service ${reason} at ${INTAKE_URL}.`);
  }

  if (!res.ok) {
    throw new IntakeUnavailableError(await describe(res, "transcribe the image"));
  }

  const data = (await res.json()) as { text?: string };
  return data.text ?? "";
}

/** Send confirmed text to the intake service; get back candidate name strings. */
export async function extractMedicines(text: string): Promise<string[]> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${INTAKE_URL}/api/v1/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      cache: "no-store",
    });
  } catch (err) {
    const reason =
      err instanceof Error && err.name === "AbortError" ? "timed out" : "could not be reached";
    throw new IntakeUnavailableError(`The intake service ${reason} at ${INTAKE_URL}.`);
  }

  if (!res.ok) {
    throw new IntakeUnavailableError(await describe(res, "extract the medicines"));
  }

  const data = (await res.json()) as { candidates?: unknown };
  return Array.isArray(data.candidates)
    ? data.candidates.filter((c): c is string => typeof c === "string")
    : [];
}

/** Build a readable error, surfacing the service's `detail` when present. */
async function describe(res: Response, action: string): Promise<string> {
  let detail = "";
  try {
    const body = (await res.json()) as { detail?: string };
    if (body?.detail) detail = ` ${body.detail}`;
  } catch {
    /* non-JSON error body — fall back to the status code */
  }
  return `The intake service could not ${action} (HTTP ${res.status}).${detail}`;
}
