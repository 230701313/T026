"""AI Image Matching Service — Phase 3 (CLIP Vision Embeddings).

Generates 512-dimensional vector embeddings for item photos using the
OpenAI CLIP ViT-B/32 model via sentence-transformers, and calculates
cross-item visual similarity.
"""

import io
import logging
import math
from functools import lru_cache
from typing import Any

import httpx

logger = logging.getLogger("uvicorn.error")


@lru_cache(maxsize=1)
def get_clip_model() -> Any:
    """Load and cache the CLIP ViT-B/32 model at module level."""
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer("clip-ViT-B-32")


def _to_float_list(val: Any) -> list[float] | None:
    """Safely convert list, numpy array, or string representation of a Postgres vector to list[float]."""
    if val is None:
        return None
    if isinstance(val, (list, tuple)):
        return [float(x) for x in val]
    if hasattr(val, "tolist"):
        return [float(x) for x in val.tolist()]
    if isinstance(val, str):
        cleaned = val.strip().strip("[]()")
        if not cleaned:
            return None
        return [float(x.strip()) for x in cleaned.split(",") if x.strip()]
    return None


def get_image_embedding(image_url: str) -> list[float] | None:
    """Download an image from a URL and compute its 512-dimensional CLIP embedding.

    Args:
        image_url: Direct URL to the stored item image.

    Returns:
        List of 512 float values representing normalized visual features, or None if failed.
    """
    if not image_url or not str(image_url).strip():
        return None

    clean_url = str(image_url).strip()

    try:
        from PIL import Image

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        with httpx.Client(timeout=10.0, follow_redirects=True, headers=headers) as client:
            response = client.get(clean_url)
            response.raise_for_status()

        image = Image.open(io.BytesIO(response.content)).convert("RGB")
        model = get_clip_model()
        embedding = model.encode(image, normalize_embeddings=True)

        result = _to_float_list(embedding)
        if not result or len(result) != 512:
            logger.error("Generated invalid embedding length (%s) for image URL: %s", len(result) if result else 0, clean_url)
            return None

        return result
    except Exception as exc:
        logger.error("Failed to generate image embedding for URL %s: %s", clean_url, exc)
        return None


def cosine_similarity(a: Any, b: Any) -> float:
    """Compute cosine similarity between two vector embeddings scaled to 0-100.

    Accepts list[float], numpy arrays, or serialized Postgres vector strings.
    If either input is None or empty, returns 0.0.

    Args:
        a: First embedding vector.
        b: Second embedding vector.

    Returns:
        Float score between 0.0 and 100.0.
    """
    if a is None or b is None:
        return 0.0

    vec_a = _to_float_list(a)
    vec_b = _to_float_list(b)

    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot_product = sum(x * y for x, y in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(x * x for x in vec_a))
    norm_b = math.sqrt(sum(y * y for y in vec_b))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    cos_sim = dot_product / (norm_a * norm_b)
    # Scale from [-1, 1] range to [0, 100], clamping negative values to 0.0
    return max(0.0, min(100.0, float(cos_sim * 100.0)))
