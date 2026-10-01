"""Semantic Text Matching Service — Phase 4 (NLP Sentence Embeddings).

Generates 384-dimensional vector embeddings for item descriptions using the
all-MiniLM-L6-v2 sentence-transformer model and computes semantic text similarity.
"""

import logging
import math
from functools import lru_cache
from typing import Any

logger = logging.getLogger("uvicorn.error")


@lru_cache(maxsize=1)
def get_text_model() -> Any:
    """Load and cache the all-MiniLM-L6-v2 model at module level."""
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer("all-MiniLM-L6-v2")


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


def get_text_embedding(text: str) -> list[float] | None:
    """Compute 384-dimensional dense semantic embedding for item text.

    Args:
        text: Title or description of the reported item.

    Returns:
        List of 384 float values representing normalized semantic features, or None on error.
    """
    clean_text = (text or "").strip()
    if not clean_text:
        return None

    try:
        model = get_text_model()
        embedding = model.encode(clean_text, normalize_embeddings=True)

        result = _to_float_list(embedding)
        if not result or len(result) != 384:
            logger.error("Generated invalid embedding length (%s) for text", len(result) if result else 0)
            return None

        return result
    except Exception as exc:
        logger.error("Failed to generate text embedding: %s", exc)
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
