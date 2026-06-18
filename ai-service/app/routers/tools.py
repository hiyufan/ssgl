"""Tools router — ten domain-specific AI generation endpoints with streaming support."""

import json
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from app.models.schemas import ToolRequest
from app.services.tool_service import tool_service, parse_competition_text

logger = logging.getLogger(__name__)

router = APIRouter(tags=["tools"])


def _safe_tool_call(fn, *args, **kwargs) -> dict:
    """Wrap an LLM tool call with error handling — returns structured error on failure."""
    try:
        result = fn(*args, **kwargs)
        return {"result": result}
    except Exception as e:
        logger.error("Tool call failed: %s", e)
        return {"result": f"⚠️ AI 生成失败: {str(e)[:200]}。请稍后重试。", "error": True}


@router.post("/business-plan")
async def business_plan(body: ToolRequest) -> dict:
    """Generate a structured business plan."""
    return _safe_tool_call(tool_service.business_plan, project_info=body.input)


@router.post("/market-analysis")
async def market_analysis(body: ToolRequest) -> dict:
    """Generate a market analysis report."""
    industry = body.input
    target_market = body.extra or ""
    return _safe_tool_call(tool_service.market_analysis, industry=industry, target_market=target_market)


@router.post("/improvement")
async def improvement_suggestions(body: ToolRequest) -> dict:
    """Generate prioritised improvement suggestions."""
    return _safe_tool_call(tool_service.improvement_suggestions, project_description=body.input)


@router.post("/tech-route")
async def tech_route(body: ToolRequest) -> dict:
    """Generate a technology roadmap and architecture recommendation."""
    requirements = body.input
    team_skills = body.extra or ""
    return _safe_tool_call(tool_service.tech_route, requirements=requirements, team_skills=team_skills)


@router.post("/resource-match")
async def resource_integration(body: ToolRequest) -> dict:
    """Analyse skill gaps and recommend resource/team strategies."""
    team_info = body.input
    project_needs = body.extra or ""
    return _safe_tool_call(tool_service.resource_integration, team_info=team_info, project_needs=project_needs)


@router.post("/pitch-deck")
async def pitch_deck(body: ToolRequest) -> dict:
    """Generate a pitch deck / presentation outline."""
    project_info = body.input
    duration = body.extra or "10分钟"
    return _safe_tool_call(tool_service.pitch_deck, project_info=project_info, duration=duration)


@router.post("/swot-analysis")
async def swot_analysis(body: ToolRequest) -> dict:
    """Generate a SWOT analysis for a competition project."""
    project_info = body.input
    competitors = body.extra or ""
    return _safe_tool_call(tool_service.swot_analysis, project_info=project_info, competitors=competitors)


@router.post("/advisor")
async def competition_advisor(body: ToolRequest) -> dict:
    """Provide strategic competition advice."""
    project_status = body.input
    time_remaining = body.extra or ""
    return _safe_tool_call(tool_service.competition_advisor, project_status=project_status, time_remaining=time_remaining)


@router.post("/competition-report")
async def competition_report(body: ToolRequest) -> dict:
    """Generate a comprehensive competition analysis report."""
    return _safe_tool_call(tool_service.competition_report, competition_info=body.input)


@router.post("/study-plan")
async def study_plan(body: ToolRequest) -> dict:
    """Generate a personalised competition preparation plan (备赛计划)."""
    competition_info = body.input
    team_info = body.extra or ""
    return _safe_tool_call(tool_service.study_plan, competition_info=competition_info, team_info=team_info)


# ---------------------------------------------------------------------------
# Streaming dispatch table
# ---------------------------------------------------------------------------

_STREAM_DISPATCH = {
    "business-plan": lambda inp, ext: tool_service.business_plan_stream(inp),
    "market-analysis": lambda inp, ext: tool_service.market_analysis_stream(inp, ext or ""),
    "improvement": lambda inp, ext: tool_service.improvement_stream(inp),
    "tech-route": lambda inp, ext: tool_service.tech_route_stream(inp, ext or ""),
    "resource-match": lambda inp, ext: tool_service.resource_integration_stream(inp, ext or ""),
    "pitch-deck": lambda inp, ext: tool_service.pitch_deck_stream(inp, ext or "10分钟"),
    "swot-analysis": lambda inp, ext: tool_service.swot_analysis_stream(inp, ext or ""),
    "advisor": lambda inp, ext: tool_service.competition_advisor_stream(inp, ext or ""),
    "competition-report": lambda inp, ext: tool_service.competition_report_stream(inp),
    "study-plan": lambda inp, ext: tool_service.study_plan_stream(inp, ext or ""),
}


@router.post("/stream/{tool_id}")
async def stream_tool(tool_id: str, body: ToolRequest):
    """SSE streaming endpoint for any AI tool — chunks are sent as they generate."""
    gen_fn = _STREAM_DISPATCH.get(tool_id)
    if not gen_fn:
        return {"error": f"Unknown tool: {tool_id}. Available: {', '.join(_STREAM_DISPATCH)}"}

    def generate():
        try:
            for chunk in gen_fn(body.input, body.extra):
                yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Tool stream error ({tool_id}): {e}")
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


class ParseCompetitionRequest(BaseModel):
    content: str

@router.post("/parse-competition")
async def parse_competition(body: ParseCompetitionRequest) -> dict:
    """Parse raw text into structured competition fields using LLM."""
    try:
        data = parse_competition_text(body.content)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}
