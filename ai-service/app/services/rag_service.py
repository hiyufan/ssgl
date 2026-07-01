"""RAG (Retrieval-Augmented Generation) service.

Provides document ingestion, similarity search, and question answering
backed by pgvector for storage and an LLM for generation.
"""

import json
import logging
import time
from dataclasses import dataclass

from sqlalchemy import text

from app.database import engine
from app.services.embedding_service import embedding_service
from app.services.llm_service import llm_service
from app.services.document_parser import document_parser
from app.services.chunking_service import chunking_service, Chunk

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "你是一个专业的竞赛管理助手。请仅使用提供的上下文文档来回答用户的问题。"
    "通过引用方括号中的来源编号来引用每条信息，例如 [1]、[2]。"
    "如果上下文没有足够的信息来回答，请诚实地说出来。"
)


@dataclass
class DocumentInfo:
    """Information about an ingested document."""

    id: int
    filename: str
    chunk_count: int
    file_size: int
    created_at: str


class RAGService:
    """Document ingestion, vector search, and RAG query service."""

    BATCH_SIZE = 64  # Embedding batch size

    # ------------------------------------------------------------------
    # Document Management
    # ------------------------------------------------------------------

    def ingest_text(
        self,
        content: str,
        metadata: dict | None = None,
        chunk_strategy: str = "semantic",
    ) -> dict:
        """Ingest raw text content.

        Returns document info with chunk IDs.
        """
        metadata = metadata or {}
        chunks = chunking_service.chunk(content, strategy=chunk_strategy, metadata=metadata)

        if not chunks:
            raise ValueError("No content to ingest after chunking")

        chunk_ids = self._embed_and_store(chunks)

        return {
            "chunk_count": len(chunk_ids),
            "chunk_ids": chunk_ids,
        }

    def ingest_file(
        self,
        file_content: bytes,
        filename: str,
        metadata: dict | None = None,
        chunk_strategy: str = "semantic",
    ) -> dict:
        """Parse a file, chunk it, and ingest into the vector store.

        Returns document info with chunk IDs.
        """
        # Parse file to extract text
        text_content = document_parser.parse(file_content, filename)

        # Add file metadata
        file_info = document_parser.get_file_info(filename, len(file_content))
        metadata = metadata or {}
        metadata.update({
            "filename": filename,
            "file_type": file_info["extension"],
            "file_size_mb": file_info["file_size_mb"],
        })

        # Chunk and ingest
        chunks = chunking_service.chunk(
            text_content, strategy=chunk_strategy, metadata=metadata
        )

        if not chunks:
            raise ValueError("No content extracted from file")

        chunk_ids = self._embed_and_store(chunks)

        return {
            "filename": filename,
            "chunk_count": len(chunk_ids),
            "chunk_ids": chunk_ids,
            "file_info": file_info,
        }

    def ingest_batch(self, documents: list[dict]) -> list[int]:
        """Batch-ingest multiple text documents.

        Each item should have a ``content`` key and optional ``metadata`` key.
        """
        all_chunks = []
        doc_chunk_counts = []

        for doc in documents:
            chunks = chunking_service.chunk(
                doc["content"],
                strategy=doc.get("chunk_strategy", "semantic"),
                metadata=doc.get("metadata", {}),
            )
            all_chunks.extend(chunks)
            doc_chunk_counts.append(len(chunks))

        if not all_chunks:
            return []

        chunk_ids = self._embed_and_store(all_chunks)

        # Return IDs grouped by document
        result = []
        idx = 0
        for count in doc_chunk_counts:
            result.append(chunk_ids[idx : idx + count])
            idx += count

        return result

    # ------------------------------------------------------------------
    # Batch Embedding & Storage
    # ------------------------------------------------------------------

    def _embed_and_store(self, chunks: list[Chunk]) -> list[int]:
        """Embed chunks in batches and store in database."""
        all_ids = []
        total = len(chunks)

        # Process in batches
        for i in range(0, total, self.BATCH_SIZE):
            batch = chunks[i : i + self.BATCH_SIZE]
            batch_contents = [c.content for c in batch]

            # Batch embed
            logger.info(
                f"Embedding batch {i // self.BATCH_SIZE + 1}/"
                f"{(total + self.BATCH_SIZE - 1) // self.BATCH_SIZE} "
                f"({len(batch)} chunks)"
            )
            embeddings = embedding_service.embed_batch(batch_contents)

            # Batch insert
            with engine.begin() as conn:
                for chunk, embedding in zip(batch, embeddings):
                    metadata_json = (
                        json.dumps(chunk.metadata) if chunk.metadata else None
                    )
                    result = conn.execute(
                        text(
                            "INSERT INTO documents (content, metadata, embedding) "
                            "VALUES (:content, :metadata, CAST(:embedding AS vector)) "
                            "RETURNING id"
                        ),
                        {
                            "content": chunk.content,
                            "metadata": metadata_json,
                            "embedding": str(embedding),
                        },
                    )
                    all_ids.append(result.scalar_one())

        logger.info(f"Ingested {len(all_ids)} chunks total")
        return all_ids

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def search(
        self,
        query: str,
        top_k: int = 5,
        threshold: float = 0.5,
        filter_metadata: dict | None = None,
    ) -> list[dict]:
        """Search for similar documents.

        Args:
            query: Search query
            top_k: Maximum results
            threshold: Minimum similarity score (0-1)
            filter_metadata: Optional metadata filters

        Returns:
            List of matching documents with similarity scores
        """
        query_embedding = embedding_service.embed(query)

        # Build query with optional metadata filter
        where_clause = ""
        params = {
            "query_embedding": str(query_embedding),
            "threshold": threshold,
            "top_k": top_k,
        }

        if filter_metadata:
            conditions = []
            for key, value in filter_metadata.items():
                param_key = f"filter_{key}"
                conditions.append(f"metadata->>:key = :{param_key}")
                params["key"] = key
                params[param_key] = str(value)
            if conditions:
                where_clause = "WHERE " + " AND ".join(conditions)

        similarity_condition = "1 - (embedding <=> CAST(:query_embedding AS vector)) >= :threshold"
        if where_clause:
            # Already has WHERE from metadata filter, use AND for similarity
            combined_where = f"{where_clause} AND {similarity_condition}"
        else:
            combined_where = f"WHERE {similarity_condition}"

        with engine.begin() as conn:
            rows = conn.execute(
                text(
                    f"SELECT id, content, metadata, "
                    f"  1 - (embedding <=> CAST(:query_embedding AS vector)) AS similarity "
                    f"FROM documents "
                    f"{combined_where} "
                    f"ORDER BY embedding <=> CAST(:query_embedding AS vector) "
                    f"LIMIT :top_k"
                ),
                params,
            ).mappings().all()

        return [
            {
                "id": row["id"],
                "content": row["content"],
                "metadata": row["metadata"],
                "similarity": float(row["similarity"]),
            }
            for row in rows
        ]

    # ------------------------------------------------------------------
    # RAG Query
    # ------------------------------------------------------------------

    def query(self, question: str, top_k: int = 5) -> dict:
        """Answer a question using retrieved documents as context."""
        results = self.search(question, top_k=top_k, threshold=0.3)

        if not results:
            return {
                "answer": "抱歉，我没有找到相关信息来回答您的问题。",
                "sources": [],
            }

        # Build numbered context block
        context_parts: list[str] = []
        sources: list[dict] = []
        for idx, doc in enumerate(results, start=1):
            context_parts.append(f"[{idx}] {doc['content']}")
            sources.append(
                {
                    "id": doc["id"],
                    "content_preview": doc["content"][:200],
                    "similarity": doc["similarity"],
                }
            )

        context = "\n\n".join(context_parts)
        user_message = f"上下文文档：\n\n{context}\n\n问题：{question}"

        answer = llm_service.chat(
            system_prompt=_SYSTEM_PROMPT,
            user_message=user_message,
        )

        return {"answer": answer, "sources": sources}

    # ------------------------------------------------------------------
    # Document Management
    # ------------------------------------------------------------------

    def list_documents(self, limit: int = 100, offset: int = 0) -> dict:
        """List all documents with statistics."""
        with engine.begin() as conn:
            # Get total count
            total = conn.execute(text("SELECT COUNT(*) FROM documents")).scalar()

            # Get documents grouped by filename
            rows = conn.execute(
                text(
                    "SELECT "
                    "  metadata->>'filename' as filename, "
                    "  COUNT(*) as chunk_count, "
                    "  MIN(created_at) as created_at "
                    "FROM documents "
                    "GROUP BY metadata->>'filename' "
                    "ORDER BY MIN(created_at) DESC "
                    "LIMIT :limit OFFSET :offset"
                ),
                {"limit": limit, "offset": offset},
            ).mappings().all()

        documents = []
        for row in rows:
            documents.append({
                "filename": row["filename"] or "unknown",
                "chunk_count": row["chunk_count"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            })

        return {
            "documents": documents,
            "total_chunks": total,
            "total_documents": len(documents),
        }

    def get_document_chunks(self, filename: str) -> list[dict]:
        """Get all chunks for a specific document."""
        with engine.begin() as conn:
            rows = conn.execute(
                text(
                    "SELECT id, content, metadata, created_at "
                    "FROM documents "
                    "WHERE metadata->>'filename' = :filename "
                    "ORDER BY id "
                    "LIMIT 500"
                ),
                {"filename": filename},
            ).mappings().all()

        return [
            {
                "id": row["id"],
                "content": row["content"],
                "metadata": row["metadata"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            }
            for row in rows
        ]

    def delete_document(self, filename: str) -> int:
        """Delete all chunks for a specific document.

        Returns number of deleted chunks.
        """
        with engine.begin() as conn:
            result = conn.execute(
                text(
                    "DELETE FROM documents WHERE metadata->>'filename' = :filename"
                ),
                {"filename": filename},
            )
            return result.rowcount

    def get_stats(self) -> dict:
        """Get knowledge base statistics."""
        with engine.begin() as conn:
            # Total chunks
            total = conn.execute(
                text("SELECT COUNT(*) FROM documents")
            ).scalar()

            # Unique documents (by filename in metadata)
            docs = conn.execute(
                text(
                    "SELECT COUNT(DISTINCT metadata->>'filename') "
                    "FROM documents WHERE metadata->>'filename' IS NOT NULL"
                )
            ).scalar()

            # Recent documents
            recent = conn.execute(
                text(
                    "SELECT metadata->>'filename' as filename, "
                    "COUNT(*) as chunk_count, "
                    "MAX(created_at) as last_updated "
                    "FROM documents "
                    "WHERE metadata->>'filename' IS NOT NULL "
                    "GROUP BY metadata->>'filename' "
                    "ORDER BY last_updated DESC LIMIT 10"
                )
            ).mappings().all()

        return {
            "total_chunks": total,
            "total_documents": docs,
            "recent_documents": [
                {
                    "filename": r["filename"],
                    "chunk_count": r["chunk_count"],
                    "last_updated": r["last_updated"].isoformat() if r["last_updated"] else None,
                }
                for r in recent
            ],
        }


# Module-level singleton
rag_service = RAGService()
