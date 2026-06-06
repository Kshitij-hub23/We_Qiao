"""FastAPI *intake* service — OCR + standardize, exposed over HTTP.

Wraps the two fuzzy-step functions so the Next.js app can reach them with the
same proxy pattern it uses for the engine:

    POST /api/v1/ocr        multipart image  -> { "text": "<transcribed>" }
    POST /api/v1/extract    { "text": ... }  -> { "candidates": [...] }
    GET  /health            liveness probe

The extract step only surfaces candidate medicine names; mapping them to dataset
entities is the engine's deterministic `/api/v1/resolve` (the safety boundary).

Kept as its own service, separate from the deterministic `hdi-api` engine, so
the fuzzy (LLM) half and the deterministic (lookup) half stay cleanly split
(CLAUDE.md, principle #2). API keys are read server-side from `.env`; the
browser never talks to Gemini/KIT directly.

Run from the `standardizer/` directory:

    pip install -r requirements.txt
    python -m uvicorn server:app --reload --port 8001
"""

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

from ocr import extract_text_from_image
from standardize import ExtractedMedicines, extract_medicines

app = FastAPI(
    title="Qiáo Intake API",
    description="OCR + medicine-name standardization (the fuzzy intake step).",
    version="1.0.0",
)

# Accepted upload content types for OCR.
_ALLOWED_PREFIX = "image/"
_ALLOWED_EXACT = {"application/pdf"}


@app.get("/health", tags=["meta"])
def health() -> dict:
    """Liveness probe."""
    return {"status": "ok"}


@app.post("/api/v1/ocr", tags=["intake"])
async def ocr(image: UploadFile = File(...)) -> dict:
    """Transcribe the text in an uploaded prescription image (English/Chinese)."""
    content_type = image.content_type or ""
    if not (content_type.startswith(_ALLOWED_PREFIX) or content_type in _ALLOWED_EXACT):
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {content_type!r}.")

    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image upload.")

    try:
        text = extract_text_from_image(data, mime_type=content_type or None)
    except Exception as exc:  # Gemini errors, key issues, etc.
        raise HTTPException(status_code=502, detail=f"OCR failed: {exc}") from exc

    return {"text": text}


class ExtractBody(BaseModel):
    text: str


@app.post("/api/v1/extract", response_model=ExtractedMedicines, tags=["intake"])
def extract(body: ExtractBody) -> ExtractedMedicines:
    """Extract candidate medicine-name strings from free text (no matching)."""
    try:
        return extract_medicines(body.text)
    except Exception as exc:  # Gemini errors, key issues, etc.
        raise HTTPException(status_code=502, detail=f"Extraction failed: {exc}") from exc
