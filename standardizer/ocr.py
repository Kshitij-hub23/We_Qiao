"""Image OCR via Gemini 2.5 Flash — the *intake* step of Qiáo.

Takes an image of a prescription / medicine label (handwritten or printed,
English or Chinese or mixed) and returns the raw text it contains, transcribed
verbatim. This is the first step of the hero flow:

    image  ->  ocr.extract_text_from_image()  ->  raw text
           ->  standardize.extract_medicines()  ->  candidate names
           ->  hdi-api /api/v1/resolve          ->  entity_ids
           ->  hdi-api /api/v1/check-conflicts

It only *reads pixels into text* — it does not classify, normalize, or judge
anything. Name extraction is the standardizer's job, entity matching is the
engine's resolver, and the safety verdict is the deterministic check (CLAUDE.md,
principle #2).

The model is reached through Google's Gemini API. The API key is read from the
environment server-side only and must never reach the browser.
"""

from __future__ import annotations

import mimetypes
import os
import random
import time
from pathlib import Path
from typing import Optional, Union

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

# Load the repo-root .env (gitignored) so the API key is available without extra
# wiring. Anchored to this file, so it works regardless of cwd. No-op if
# python-dotenv isn't installed or the file is absent — a real env var still wins.
try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

MODEL = "gemini-2.5-flash"

# Env vars checked, in order, for the Gemini key.
_API_KEY_VARS = ("GEMINI_API_KEY", "GOOGLE_API_KEY")

# Transient API failures worth retrying: rate limiting (429) and server hiccups
# (5xx, e.g. the 503 "high demand" spike). Other errors fail fast.
_RETRYABLE_STATUS = frozenset({429, 500, 502, 503, 504})
_DEFAULT_MAX_ATTEMPTS = 3
_BASE_RETRY_DELAY = 1.0  # seconds; doubles each attempt, plus jitter

OCR_PROMPT = """\
Transcribe ALL text visible in this image, exactly as it appears.

- The text may be in English, Chinese, or a mix of both. Preserve the original
  language and characters — do NOT translate or romanize anything.
- Preserve the original reading order and line breaks.
- Transcribe numbers, units, dosages, and punctuation exactly as written.
- Output ONLY the transcribed text. Do not add commentary, headings, labels,
  explanations, or markdown.
- If the image contains no legible text, return an empty response.
"""

ImageInput = Union[str, "os.PathLike[str]", bytes, bytearray]

# Magic-number signatures for inferring the MIME type when it isn't given.
_MAGIC_SIGNATURES = (
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
    (b"BM", "image/bmp"),
    (b"%PDF", "application/pdf"),
)


def extract_text_from_image(
    image: ImageInput,
    *,
    mime_type: Optional[str] = None,
    client: Optional[genai.Client] = None,
    model: str = MODEL,
    max_attempts: int = _DEFAULT_MAX_ATTEMPTS,
) -> str:
    """Transcribe the text in an image using Gemini 2.5 Flash.

    Args:
        image: A path to an image file (`str` / `Path`) or the raw image
            `bytes`. Supports the formats Gemini accepts (PNG, JPEG, WEBP, etc.).
        mime_type: Optional explicit MIME type (e.g. `"image/png"`). Inferred
            from the file extension or the bytes' magic number when omitted.
        client: Optional pre-built `genai.Client` (handy for tests / reuse). When
            omitted, one is created from the API key in the environment.
        model: Override the Gemini model id.
        max_attempts: Total tries on transient API errors (429 / 5xx), with
            exponential backoff + jitter between them. Set to 1 to disable.

    Returns:
        The transcribed text, stripped. Empty string if the image is empty or
        the model finds no legible text.

    Raises:
        TypeError: if `image` is neither a path nor bytes.
        ValueError: if no Gemini API key is found and no client was supplied.
        google.genai.errors.APIError: on a non-retryable error, or after the
            final attempt fails.
    """
    data, mime_type = _load_image(image, mime_type)
    if not data:
        return ""

    if client is None:
        client = genai.Client(api_key=_resolve_api_key())

    response = _generate_with_retry(
        client,
        model=model,
        contents=[
            types.Part.from_bytes(data=data, mime_type=mime_type),
            OCR_PROMPT,
        ],
        config=types.GenerateContentConfig(temperature=0),  # deterministic transcription
        max_attempts=max_attempts,
    )
    return (response.text or "").strip()


def _generate_with_retry(
    client: genai.Client,
    *,
    model: str,
    contents: list,
    config: "types.GenerateContentConfig",
    max_attempts: int,
    base_delay: float = _BASE_RETRY_DELAY,
):
    """Call `generate_content`, retrying transient (429 / 5xx) failures.

    Backoff is exponential (`base_delay * 2**attempt`) plus random jitter to
    avoid thundering-herd retries. Non-retryable errors and the final failure
    propagate to the caller.
    """
    for attempt in range(max_attempts):
        try:
            return client.models.generate_content(
                model=model, contents=contents, config=config
            )
        except genai_errors.APIError as exc:
            last_attempt = attempt == max_attempts - 1
            if getattr(exc, "code", None) not in _RETRYABLE_STATUS or last_attempt:
                raise
            delay = base_delay * (2 ** attempt) + random.uniform(0, base_delay)
            time.sleep(delay)


def _load_image(image: ImageInput, mime_type: Optional[str]) -> tuple[bytes, str]:
    """Resolve the input to (bytes, mime_type), inferring the MIME if needed."""
    if isinstance(image, (bytes, bytearray)):
        data = bytes(image)
    elif isinstance(image, (str, os.PathLike)):
        path = Path(image)
        data = path.read_bytes()
        if mime_type is None:
            mime_type = mimetypes.guess_type(str(path))[0]
    else:
        raise TypeError(
            f"image must be a file path or bytes, got {type(image).__name__}"
        )

    if mime_type is None:
        mime_type = _sniff_mime(data) or "image/jpeg"
    return data, mime_type


def _sniff_mime(data: bytes) -> Optional[str]:
    """Best-effort MIME detection from the leading bytes."""
    for signature, mime in _MAGIC_SIGNATURES:
        if data.startswith(signature):
            return mime
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def _resolve_api_key() -> str:
    for var in _API_KEY_VARS:
        value = os.environ.get(var)
        if value:
            return value
    raise ValueError(
        "No Gemini API key found. Set GEMINI_API_KEY (preferred) in the server "
        f"environment, or one of {_API_KEY_VARS[1:]}, or pass a `client` explicitly."
    )


if __name__ == "__main__":
    # Quick manual check:
    #   python ocr.py path/to/prescription.jpg
    import sys

    if len(sys.argv) != 2:
        print("usage: python ocr.py <image-path>", file=sys.stderr)
        raise SystemExit(2)
    print(extract_text_from_image(sys.argv[1]))
