"""Embedding service backed by local HuggingFace model."""

from sentence_transformers import SentenceTransformer
import numpy as np

from app.config import get_settings

settings = get_settings()


class EmbeddingService:
    """Generate text embeddings using local BGE model."""

    def __init__(self):
        self._model_name = settings.EMBEDDING_MODEL
        self._dimensions = settings.EMBEDDING_DIMENSIONS
        # Load model locally (no API key needed)
        print(f"Loading embedding model: {self._model_name}...")
        self._model = SentenceTransformer(self._model_name)
        print(f"✅ Embedding model loaded (dimensions={self._dimensions})")

    def embed(self, text: str) -> list[float]:
        """Return the embedding vector for a single text."""
        embedding = self._model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Return embedding vectors for a batch of texts."""
        embeddings = self._model.encode(texts, normalize_embeddings=True, batch_size=32)
        return embeddings.tolist()


# Module-level singleton
embedding_service = EmbeddingService()
