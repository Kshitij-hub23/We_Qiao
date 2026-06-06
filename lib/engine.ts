import type { CheckRequest, ConflictDetail } from "./types";

/**
 * Server-side wrapper around the external HDI engine (Python/FastAPI).
 * The engine base URL lives only here (and in env) so the browser never talks
 * to it directly — keeps the integration point in one place and avoids CORS.
 */

const ENGINE_URL = process.env.ENGINE_URL ?? "http://127.0.0.1:8000";
const TIMEOUT_MS = 8000;

/** Raised when the engine is unreachable, times out, or returns a bad status. */
export class EngineUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineUnavailableError";
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

/** POST the two medicine lists to the engine and return the detected conflicts. */
export async function checkConflicts(req: CheckRequest): Promise<ConflictDetail[]> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${ENGINE_URL}/api/v1/check-conflicts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      cache: "no-store",
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === "AbortError" ? "timed out" : "could not be reached";
    throw new EngineUnavailableError(`The conflict engine ${reason} at ${ENGINE_URL}.`);
  }

  if (!res.ok) {
    throw new EngineUnavailableError(`The conflict engine responded with HTTP ${res.status}.`);
  }

  const data = (await res.json()) as ConflictDetail[];
  return Array.isArray(data) ? data : [];
}

/** Liveness check used by /api/engine/health for the connection indicator. */
export async function engineHealthy(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${ENGINE_URL}/health`, { method: "GET", cache: "no-store" });
    if (!res.ok) return false;
    const body = (await res.json()) as { status?: string };
    return body?.status === "ok";
  } catch {
    return false;
  }
}
