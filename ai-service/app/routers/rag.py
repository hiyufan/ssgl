"""RAG (Retrieval-Augmented Generation) router with document management."""

import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from app.models.schemas import RAGIngest, RAGIngestBatch, RAGQuery
from app.services.rag_service import rag_service
from app.services.document_parser import document_parser

logger = logging.getLogger(__name__)

router = APIRouter(tags=["rag"])


# ------------------------------------------------------------------
# Query & Search
# ------------------------------------------------------------------

@router.post("/query")
async def query(body: RAGQuery) -> dict:
    """Answer a question using retrieved documents as context."""
    return rag_service.query(question=body.question, top_k=body.top_k)


@router.post("/search")
async def search(body: RAGQuery) -> dict:
    """Search for similar documents without LLM generation."""
    results = rag_service.search(query=body.question, top_k=body.top_k, threshold=0.3)
    return {"results": results}


# ------------------------------------------------------------------
# Text Ingestion
# ------------------------------------------------------------------

@router.post("/ingest")
async def ingest(body: RAGIngest) -> dict:
    """Ingest a single text document into the vector store."""
    result = rag_service.ingest_text(
        content=body.content,
        metadata=body.metadata,
        chunk_strategy=body.chunk_strategy or "semantic",
    )
    return result


@router.post("/ingest/batch")
async def ingest_batch(body: RAGIngestBatch) -> dict:
    """Batch-ingest multiple text documents into the vector store."""
    docs = [doc.model_dump() for doc in body.documents]
    results = rag_service.ingest_batch(documents=docs)
    return {"results": results}


# ------------------------------------------------------------------
# File Upload
# ------------------------------------------------------------------

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    chunk_strategy: str = Form("semantic"),
    metadata: Optional[str] = Form(None),
) -> dict:
    """Upload and ingest a file (PDF, Word, TXT, MD).

    The file is parsed, chunked, embedded, and stored in the vector store.
    """
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Check file size (limit: 50MB)
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum size is 50MB."
        )

    # Parse metadata if provided
    import json
    meta = {}
    if metadata:
        try:
            meta = json.loads(metadata)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid metadata JSON")

    try:
        result = rag_service.ingest_file(
            file_content=content,
            filename=file.filename,
            metadata=meta,
            chunk_strategy=chunk_strategy,
        )
        return {
            "message": f"File '{file.filename}' ingested successfully",
            **result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"File upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process file")


@router.post("/upload/batch")
async def upload_batch(
    files: list[UploadFile] = File(...),
    chunk_strategy: str = Form("semantic"),
) -> dict:
    """Upload and ingest multiple files."""
    results = []
    errors = []

    for file in files:
        if not file.filename:
            errors.append({"filename": "unknown", "error": "No filename"})
            continue

        try:
            content = await file.read()
            if len(content) > 50 * 1024 * 1024:
                errors.append({
                    "filename": file.filename,
                    "error": "File too large (max 50MB)"
                })
                continue

            result = rag_service.ingest_file(
                file_content=content,
                filename=file.filename,
                chunk_strategy=chunk_strategy,
            )
            results.append({
                "filename": file.filename,
                **result,
            })
        except Exception as e:
            errors.append({
                "filename": file.filename,
                "error": str(e),
            })

    return {
        "success": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors,
    }


# ------------------------------------------------------------------
# Document Management
# ------------------------------------------------------------------

@router.get("/documents")
async def list_documents(
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """List all documents in the knowledge base."""
    return rag_service.list_documents(limit=limit, offset=offset)


@router.get("/documents/{filename}/chunks")
async def get_document_chunks(filename: str) -> dict:
    """Get all chunks for a specific document."""
    chunks = rag_service.get_document_chunks(filename)
    return {"filename": filename, "chunks": chunks, "count": len(chunks)}


@router.delete("/documents/{filename}")
async def delete_document(filename: str) -> dict:
    """Delete all chunks for a specific document."""
    deleted = rag_service.delete_document(filename)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "message": f"Document '{filename}' deleted",
        "chunks_deleted": deleted,
    }


@router.get("/stats")
async def get_stats() -> dict:
    """Get knowledge base statistics."""
    return rag_service.get_stats()
