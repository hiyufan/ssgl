"""Review router — pre-plan evaluation and execution-plan matching."""

import asyncio
import logging

from fastapi import APIRouter

from app.models.schemas import ExecutionMatch, PrePlanReview
from app.services.review_service import review_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["review"])


@router.post("/pre-plan")
async def pre_plan_review(body: PrePlanReview) -> dict:
    """Evaluate a project pre-plan for feasibility and innovation."""
    plan = body.model_dump()
    try:
        return await asyncio.to_thread(review_service.review_pre_plan, plan=plan)
    except Exception as e:
        logger.error("Pre-plan review failed: %s", e)
        return {
            "score": 0,
            "dimensions": {},
            "feedback": f"⚠️ AI 评审失败: {str(e)[:200]}。请稍后重试。",
            "error": True,
        }


@router.post("/execution-match")
async def execution_match(body: ExecutionMatch) -> dict:
    """Compare an execution plan against its originating pre-plan."""
    pre_plan = body.pre_plan.model_dump()
    execution = {
        "actual_tech": body.actual_tech,
        "actual_progress": body.actual_progress,
        "deviations": body.deviations,
    }
    try:
        return await asyncio.to_thread(review_service.match_execution, pre_plan=pre_plan, execution=execution)
    except Exception as e:
        logger.error("Execution match failed: %s", e)
        return {
            "match_score": 0,
            "feedback": f"⚠️ 执行匹配分析失败: {str(e)[:200]}。请稍后重试。",
            "error": True,
        }
