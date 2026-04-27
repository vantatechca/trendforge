"""Embedding helpers. Uses the OpenAI-compatible API (or any compatible provider).

We do NOT write to the pgvector column from Python (Prisma owns the schema).
Instead, we keep embeddings opt-in: similarity checks run only when the env key is set.
"""

from __future__ import annotations
import os
import math
import httpx

EMBEDDINGS_API_KEY = os.getenv("EMBEDDINGS_API_KEY", "")
EMBEDDINGS_BASE_URL = os.getenv("EMBEDDINGS_BASE_URL", "https://api.openai.com/v1")
EMBEDDINGS_MODEL = os.getenv("EMBEDDINGS_MODEL", "text-embedding-3-small")


def generate_embedding(text: str) -> list[float] | None:
    if not EMBEDDINGS_API_KEY or not text:
        return None
    try:
        with httpx.Client(timeout=20.0) as client:
            r = client.post(
                f"{EMBEDDINGS_BASE_URL}/embeddings",
                headers={
                    "Authorization": f"Bearer {EMBEDDINGS_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={"input": text[:8000], "model": EMBEDDINGS_MODEL},
            )
            r.raise_for_status()
            return r.json()["data"][0]["embedding"]
    except Exception as e:
        print(f"[embeddings] failed: {e}")
        return None


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)
