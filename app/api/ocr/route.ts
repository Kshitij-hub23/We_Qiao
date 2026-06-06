import { NextResponse } from "next/server";
import { ocrImage, IntakeUnavailableError } from "@/lib/intake";
import type { OcrResult } from "@/lib/types";

/**
 * Receives an uploaded prescription image from the browser and forwards it to
 * the Python intake service for OCR. Runs on Node (not edge) so it can reach a
 * localhost service and handle multipart uploads.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Guard against oversized uploads before we forward them.
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export async function POST(request: Request): Promise<NextResponse<OcrResult>> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Expected a file upload." }, { status: 400 });
  }

  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ ok: false, error: "No image was provided." }, { status: 400 });
  }
  if (image.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "That image is too large (max 15 MB)." },
      { status: 413 },
    );
  }

  try {
    const text = await ocrImage(image);
    return NextResponse.json({ ok: true, text });
  } catch (err) {
    if (err instanceof IntakeUnavailableError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { ok: false, error: "Unexpected error during text extraction." },
      { status: 500 },
    );
  }
}
