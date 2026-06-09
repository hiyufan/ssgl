"""Review router — pre-plan evaluation and execution-plan matching."""

from fastapi import APIRouter

from app.models.schemas import ExecutionMatch, PrePlanReview
from app.services.review_service import review_service

router = APIRouter(tags=["review"])


@router.post("/pre-plan")
async def pre_plan_review(body: PrePlanReview) -> dict:
    """Evaluate a project pre-plan for feasibility and innovation."""
    plan = body.model_dump()
    return review_service.review_pre_plan(plan=plan)


@router.post("/execution-match")
async def execution_match(body: ExecutionMatch) -> dict:
    """Compare an execution plan against its originating pre-plan."""
    pre_plan = body.pre_plan.model_dump()
    execution = {
        "actual_tech": body.actual_tech,
        "actual_progress": body.actual_progress,
        "deviations": body.deviations,
    }
    return review_service.match_execution(pre_plan=pre_plan, execution=execution)
