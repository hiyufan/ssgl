"""Review service for pre-plan evaluation and execution-plan matching."""

import json
import re

from app.services.llm_service import llm_service
from app.services.rag_service import rag_service
from app.utils.prompts import EXECUTION_MATCH_SYSTEM, PRE_PLAN_REVIEW_SYSTEM


class ReviewService:
    """Provides AI-powered review of project plans."""

    # ------------------------------------------------------------------
    # Pre-plan review
    # ------------------------------------------------------------------

    def review_pre_plan(self, plan: dict) -> dict:
        """Evaluate a project pre-plan for feasibility, innovation, etc.

        Returns a structured review dict with score, breakdown, summary,
        suggestions, and the similar past projects used as context.
        """

        # 1. Retrieve similar past projects from the vector store
        query_text = json.dumps(plan, ensure_ascii=False)
        similar_projects = rag_service.search(query_text, top_k=5, threshold=0.3)

        # 2. Build the user message with plan details + similar projects
        context_parts: list[str] = []
        for idx, doc in enumerate(similar_projects, start=1):
            context_parts.append(
                f"[Similar Project {idx}] (similarity: {doc['similarity']:.2f})\n"
                f"{doc['content']}"
            )

        similar_context = "\n\n".join(context_parts) if context_parts else "None found."

        user_message = (
            f"## Project Pre-Plan\n\n```json\n{json.dumps(plan, ensure_ascii=False, indent=2)}\n```\n\n"
            f"## Similar Past Projects\n\n{similar_context}\n\n"
            "Please evaluate the pre-plan above."
        )

        # 3. Call LLM
        raw_response = llm_service.chat(
            system_prompt=PRE_PLAN_REVIEW_SYSTEM,
            user_message=user_message,
        )

        # 4. Parse JSON (handle markdown code fences if present)
        result = _parse_json(raw_response)

        # 5. Attach similar projects metadata
        result["similar_projects"] = [
            {
                "id": doc["id"],
                "content_preview": doc["content"][:200],
                "similarity": doc["similarity"],
            }
            for doc in similar_projects
        ]

        return result

    # ------------------------------------------------------------------
    # Execution plan matching
    # ------------------------------------------------------------------

    def match_execution(self, pre_plan: dict, execution: dict) -> dict:
        """Compare an execution plan against its originating pre-plan.

        Returns a structured analysis with score, breakdown, summary,
        deviations, and suggestions.
        """

        user_message = (
            f"## Pre-Plan\n\n```json\n{json.dumps(pre_plan, ensure_ascii=False, indent=2)}\n```\n\n"
            f"## Execution Plan\n\n```json\n{json.dumps(execution, ensure_ascii=False, indent=2)}\n```\n\n"
            "Please compare the execution plan against the pre-plan."
        )

        raw_response = llm_service.chat(
            system_prompt=EXECUTION_MATCH_SYSTEM,
            user_message=user_message,
        )

        return _parse_json(raw_response)


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _parse_json(text: str) -> dict:
    """Extract a JSON object from *text*, stripping markdown fences if present."""

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strip ```json ... ``` or ``` ... ``` fences
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))

    # Last resort: find first { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))

    raise ValueError(f"Could not parse JSON from LLM response:\n{text}")


# Module-level singleton
review_service = ReviewService()
