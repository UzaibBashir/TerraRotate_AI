"""Plain-language image descriptions for farmer photos and NASA browse imagery."""
import base64
import os
import re

import requests


SUPPORTED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def vision_available():
    return bool(os.environ.get("OPENAI_API_KEY"))


def describe_image(image_data, mime_type, image_kind, context=None):
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("Image descriptions are not configured yet. Add OPENAI_API_KEY to the backend environment and restart the API.")
    if mime_type not in SUPPORTED_TYPES:
        raise ValueError("Choose a JPEG, PNG, WEBP, or GIF image.")
    if image_kind not in {"farm_photo", "nasa_satellite"}:
        raise ValueError("Choose a farm photo or NASA satellite image.")
    if not isinstance(image_data, str):
        raise ValueError("Select an image to describe.")
    encoded = image_data.strip()
    if encoded.startswith("data:"):
        match = re.fullmatch(r"data:([^;,]+);base64,(.+)", encoded, re.DOTALL)
        if not match or match.group(1).lower() != mime_type:
            raise ValueError("The image data is invalid or its file type does not match.")
        encoded = match.group(2)
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (ValueError, base64.binascii.Error):
        raise ValueError("The image could not be read. Please choose it again.")
    if not raw or len(raw) > MAX_IMAGE_BYTES:
        raise ValueError("Images must be smaller than 5 MB.")

    if image_kind == "farm_photo":
        prompt = (
            "Describe this farm or crop photo in clear, practical language for a farmer. State only visible details, "
            "such as crop or plants if recognizable, visible color or growth patterns, and anything unclear. "
            "Do not diagnose disease, pests, nutrient deficiency, soil condition, or yield from an image. "
            "Do not recommend chemical treatments. Finish with one or two sensible things the farmer can check in person. "
            "If the image is not a farm scene, say what it appears to show without guessing. Keep it under 180 words."
        )
        source = "Uploaded farm photo"
        caution = "This is a visual description only. A photo cannot confirm crop disease, pest identity, soil condition, or yield."
    else:
        prompt = (
            "Describe this NASA satellite browse image for a farmer in plain language. Describe only broad visible patterns, "
            "colors, clouds, and coverage. If it is an index or thematic visualization, explain that colors reflect the map's "
            "visualization and are not direct field measurements. Do not estimate field-level crop health, soil moisture, rainfall, "
            "or numeric values from image colors. Mention that resolution and clouds may hide local detail. "
            f"Image context: {str(context or 'NASA GIBS browse image')[:400]}. Keep it under 180 words."
        )
        source = "NASA GIBS satellite browse image"
        caution = "This describes a rendered regional map. It does not extract numeric satellite measurements or diagnose field conditions."

    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": os.environ.get("OPENAI_VISION_MODEL", "gpt-4.1-mini"),
                "messages": [{"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{encoded}", "detail": "high"}},
                ]}],
                "max_tokens": 300,
            },
            timeout=60,
        )
    except requests.RequestException as exc:
        raise RuntimeError("The image service could not be reached. Check the backend network connection and try again.") from exc
    if not response.ok:
        if response.status_code in (401, 403):
            raise RuntimeError("The image service rejected the backend API key. Check OPENAI_API_KEY and its access.")
        if response.status_code == 429:
            raise RuntimeError("The image service is busy or its usage limit was reached. Try again later.")
        raise RuntimeError("The image could not be described right now. Try again in a moment.")
    try:
        description = response.json()["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError):
        raise RuntimeError("The image service returned an unreadable description. Please try again.")
    if not isinstance(description, str) or not description.strip():
        raise RuntimeError("The image service did not return a description. Please try again.")
    return {"source": source, "description": description.strip(), "caution": caution}
