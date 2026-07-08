"""Pydantic request / response schemas for the AI service API."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


# ── RAG ────────────────────────────────────────────────────────────────────


class RAGQuery(BaseModel):
    """Request body for a RAG question-answering query."""

    question: str
    top_k: int = 5


class RAGIngest(BaseModel):
    """A single document to ingest into the vector store."""

    content: str
    metadata: dict = Field(default_factory=dict)
    chunk_strategy: Optional[str] = "semantic"  # "paragraph", "sentence", "fixed", "semantic"


class RAGIngestBatch(BaseModel):
    """Batch ingestion of multiple documents."""

    documents: list[RAGIngest]


# ── Review ─────────────────────────────────────────────────────────────────


class PrePlanReview(BaseModel):
    """Request body for pre-plan evaluation."""

    title: str
    tech_stack: str
    target_audience: str
    market_analysis: str
    innovation: str
    expected_outcome: str
    timeline: str


class ExecutionMatch(BaseModel):
    """Request body for execution-plan matching against a pre-plan."""

    pre_plan: Optional[PrePlanReview] = None
    pre_plan_id: Optional[int] = None
    plan_text: Optional[str] = None
    execution_text: Optional[str] = None
    actual_tech: Optional[str] = None
    actual_progress: Optional[str] = None
    deviations: Optional[str] = None


# ── Tools ──────────────────────────────────────────────────────────────────


class ToolRequest(BaseModel):
    """Generic request body for the six AI tool endpoints."""

    input: str
    extra: Optional[str] = None
