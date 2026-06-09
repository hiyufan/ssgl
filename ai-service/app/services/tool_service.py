"""AI Tools service.

Provides six specialised generation tools for competition projects, each
backed by ``llm_service.chat()`` and optionally enriched with context
retrieved via ``rag_service.search()``.
"""

from app.services.llm_service import llm_service
from app.services.rag_service import rag_service


def _rag_context(query: str, top_k: int = 3) -> str:
    """Return a formatted RAG context block, or an empty string on no results."""
    results = rag_service.search(query, top_k=top_k)
    if not results:
        return ""
    lines = []
    for idx, doc in enumerate(results, start=1):
        lines.append(f"[{idx}] {doc['content']}")
    return "\n\n--- Relevant Reference Documents ---\n" + "\n\n".join(lines)


class ToolService:
    """Facade that exposes six domain-specific AI tools."""

    # ------------------------------------------------------------------
    # 1. Business Plan
    # ------------------------------------------------------------------

    def business_plan(self, project_info: str) -> str:
        """Generate a structured business plan in markdown."""
        system_prompt = (
            "You are an expert business plan writer with extensive experience "
            "in startup and innovation competitions. Based on the project "
            "information provided, produce a comprehensive business plan in "
            "well-structured markdown with the following sections:\n"
            "1. Executive Summary\n"
            "2. Market Opportunity\n"
            "3. Product / Service Description\n"
            "4. Business Model\n"
            "5. Competitive Advantage\n"
            "6. Team Overview\n"
            "7. Financial Projections\n\n"
            "Be specific, data-driven where possible, and tailor the plan to "
            "the strengths of the described project."
        )

        user_message = f"Project information:\n{project_info}"
        user_message += _rag_context(project_info)

        return llm_service.chat(system_prompt=system_prompt, user_message=user_message)

    # ------------------------------------------------------------------
    # 2. Market Analysis
    # ------------------------------------------------------------------

    def market_analysis(self, industry: str, target_market: str) -> str:
        """Generate a market analysis report in markdown."""
        system_prompt = (
            "You are a senior market analyst. Produce a detailed market "
            "analysis report in well-structured markdown covering:\n"
            "1. Market Size & Growth Rate\n"
            "2. Market Segments\n"
            "3. Key Competitors and Their Positioning\n"
            "4. Target User Personas\n"
            "5. Market Opportunities & Gaps\n"
            "6. Entry Strategy Recommendations\n\n"
            "Use quantitative data where available and cite trends."
        )

        query = f"{industry} {target_market} market analysis"
        user_message = (
            f"Industry: {industry}\nTarget Market: {target_market}"
        )
        user_message += _rag_context(query)

        return llm_service.chat(system_prompt=system_prompt, user_message=user_message)

    # ------------------------------------------------------------------
    # 3. Improvement Suggestions
    # ------------------------------------------------------------------

    def improvement_suggestions(self, project_description: str) -> str:
        """Generate prioritised improvement suggestions in markdown."""
        system_prompt = (
            "You are a seasoned competition advisor who has guided many "
            "winning teams. Analyse the project description and provide "
            "actionable improvement suggestions in markdown. For each "
            "suggestion, assign a priority level (High / Medium / Low) and "
            "explain the expected impact. Group suggestions by priority. "
            "Reference similar successful approaches where possible."
        )

        user_message = f"Project description:\n{project_description}"
        user_message += _rag_context(f"winning projects similar to {project_description}")

        return llm_service.chat(system_prompt=system_prompt, user_message=user_message)

    # ------------------------------------------------------------------
    # 4. Tech Route (Technology Roadmap)
    # ------------------------------------------------------------------

    def tech_route(self, requirements: str, team_skills: str) -> str:
        """Generate a technology roadmap and architecture recommendation."""
        system_prompt = (
            "You are a senior software architect with broad experience across "
            "modern technology stacks. Based on the project requirements and "
            "the team's skill set, produce a technology roadmap in markdown "
            "covering:\n"
            "1. Recommended Technology Stack (with justification)\n"
            "2. System Architecture Overview\n"
            "3. Development Plan / Milestones\n"
            "4. Technical Risks and Mitigation Strategies\n\n"
            "Prioritise pragmatic choices that match the team's capabilities "
            "while keeping scalability in mind."
        )

        user_message = (
            f"Project Requirements:\n{requirements}\n\n"
            f"Team Skills:\n{team_skills}"
        )

        return llm_service.chat(system_prompt=system_prompt, user_message=user_message)

    # ------------------------------------------------------------------
    # 5. Resource Integration
    # ------------------------------------------------------------------

    def resource_integration(self, team_info: str, project_needs: str) -> str:
        """Analyse skill gaps and recommend resource/team strategies."""
        system_prompt = (
            "You are a cross-discipline expert experienced in assembling and "
            "optimising competition teams. Analyse the current team and "
            "project needs, then produce a resource integration plan in "
            "markdown covering:\n"
            "1. Current Skill Inventory\n"
            "2. Identified Skill Gaps\n"
            "3. Recommended External Resources (tools, libraries, APIs, "
            "partners)\n"
            "4. Suggested Team Division of Labour\n"
            "5. Action Items to Close Gaps\n"
        )

        user_message = (
            f"Team Information:\n{team_info}\n\n"
            f"Project Needs:\n{project_needs}"
        )

        return llm_service.chat(system_prompt=system_prompt, user_message=user_message)

    # ------------------------------------------------------------------
    # 6. Competition Advisor
    # ------------------------------------------------------------------

    def competition_advisor(
        self, project_status: str, time_remaining: str
    ) -> str:
        """Provide strategic competition advice based on current status."""
        system_prompt = (
            "You are a competition strategist who has coached numerous "
            "award-winning teams. Given the current project status and the "
            "time remaining, produce a strategic advisory report in markdown "
            "covering:\n"
            "1. Status Assessment (strengths, risks, gaps)\n"
            "2. Prioritised Task List (critical / important / nice-to-have)\n"
            "3. Time Allocation Recommendations\n"
            "4. Presentation & Demo Preparation Tips\n"
            "5. Common Pitfalls to Avoid\n\n"
            "Be realistic about what can be achieved in the remaining time."
        )

        user_message = (
            f"Current Project Status:\n{project_status}\n\n"
            f"Time Remaining: {time_remaining}"
        )

        return llm_service.chat(system_prompt=system_prompt, user_message=user_message)


# Module-level singleton
tool_service = ToolService()
