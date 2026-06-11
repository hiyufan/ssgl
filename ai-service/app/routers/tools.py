"""Tools router — six domain-specific AI generation endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.models.schemas import ToolRequest
from app.services.tool_service import tool_service, parse_competition_text

router = APIRouter(tags=["tools"])


@router.post("/business-plan")
async def business_plan(body: ToolRequest) -> dict:
    """Generate a structured business plan."""
    result = tool_service.business_plan(project_info=body.input)
    return {"result": result}


@router.post("/market-analysis")
async def market_analysis(body: ToolRequest) -> dict:
    """Generate a market analysis report."""
    industry = body.input
    target_market = body.extra or ""
    result = tool_service.market_analysis(industry=industry, target_market=target_market)
    return {"result": result}


@router.post("/improvement")
async def improvement_suggestions(body: ToolRequest) -> dict:
    """Generate prioritised improvement suggestions."""
    result = tool_service.improvement_suggestions(project_description=body.input)
    return {"result": result}


@router.post("/tech-route")
async def tech_route(body: ToolRequest) -> dict:
    """Generate a technology roadmap and architecture recommendation."""
    requirements = body.input
    team_skills = body.extra or ""
    result = tool_service.tech_route(requirements=requirements, team_skills=team_skills)
    return {"result": result}


@router.post("/resource-match")
async def resource_integration(body: ToolRequest) -> dict:
    """Analyse skill gaps and recommend resource/team strategies."""
    team_info = body.input
    project_needs = body.extra or ""
    result = tool_service.resource_integration(team_info=team_info, project_needs=project_needs)
    return {"result": result}


@router.post("/advisor")
async def competition_advisor(body: ToolRequest) -> dict:
    """Provide strategic competition advice."""
    project_status = body.input
    time_remaining = body.extra or ""
    result = tool_service.competition_advisor(
        project_status=project_status, time_remaining=time_remaining
    )
    return {"result": result}


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
