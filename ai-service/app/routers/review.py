"""Review router — pre-plan evaluation and execution-plan matching."""

import asyncio
import logging

from fastapi import APIRouter, HTTPException

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
            "breakdown": {},
            "summary": f"AI 评审失败: {str(e)[:200]}。请稍后重试。",
            "suggestions": [],
            "error": True,
        }


@router.post("/execution-match")
async def execution_match(body: ExecutionMatch) -> dict:
    """Compare an execution plan against its originating pre-plan."""
    if body.pre_plan:
        pre_plan = body.pre_plan.model_dump()
    else:
        plan_text = (body.plan_text or "").strip()
        if not plan_text:
            raise HTTPException(status_code=400, detail="缺少预案内容")
        pre_plan = {
            "pre_plan_id": body.pre_plan_id,
            "plan_text": plan_text,
        }

    execution_text = (body.execution_text or "").strip()
    execution = {
        "execution_text": execution_text,
        "actual_tech": body.actual_tech or "",
        "actual_progress": body.actual_progress or "",
        "deviations": body.deviations or "",
    }

    if not any(str(value).strip() for value in execution.values()):
        raise HTTPException(status_code=400, detail="缺少实际执行情况")

    try:
        return await asyncio.to_thread(review_service.match_execution, pre_plan=pre_plan, execution=execution)
    except Exception as e:
        logger.error("Execution match failed: %s", e)
        return {
            "match_score": 0,
            "feedback": f"⚠️ 执行匹配分析失败: {str(e)[:200]}。请稍后重试。",
            "error": True,
        }
