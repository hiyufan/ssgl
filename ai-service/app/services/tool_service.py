"""AI Tools service.

Provides eight specialised generation tools for competition projects, each
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
    """Facade that exposes eight domain-specific AI tools."""

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
    # 6. Pitch Deck Outline
    # ------------------------------------------------------------------

    def pitch_deck(self, project_info: str, duration: str = "10分钟") -> str:
        """Generate a pitch deck / presentation outline."""
        system_prompt = (
            "你是一位资深创业路演教练，曾指导过数百个获奖项目。根据项目信息和答辩时长，"
            "生成一份结构化的路演PPT大纲（Markdown格式），包含：\n"
            "1. 开场设计（Hook / 痛点引入）\n"
            "2. 问题与机遇（背景数据 + 用户画像）\n"
            "3. 解决方案（产品/服务亮点 + 技术架构概要）\n"
            "4. 市场分析（TAM/SAM/SOM + 竞争格局）\n"
            "5. 商业模式（盈利方式 + 定价策略）\n"
            "6. 项目进展（里程碑 + 数据验证 + MVP展示）\n"
            "7. 团队介绍（核心成员 + 技能互补）\n"
            "8. 发展规划（短期/中期/长期目标）\n"
            "9. 资金需求与用途\n"
            "10. 收尾设计（金句 / Call to Action）\n\n"
            "每页建议注明：页标题、核心信息点、建议视觉元素、预估时长。"
            "根据答辩总时长合理分配每页时间。"
        )

        user_message = f"项目信息：\n{project_info}\n\n答辩时长：{duration}"
        user_message += _rag_context(f"路演答辩 演示技巧 {project_info}")

        return llm_service.chat(system_prompt=system_prompt, user_message=user_message)

    # ------------------------------------------------------------------
    # 7. SWOT Analysis
    # ------------------------------------------------------------------

    def swot_analysis(self, project_info: str, competitors: str = "") -> str:
        """Generate a SWOT analysis for a competition project."""
        system_prompt = (
            "你是一位资深战略分析师，擅长为大学生创新创业竞赛项目做SWOT分析。"
            "根据项目信息，生成一份详尽的SWOT分析报告（Markdown格式），包含：\n"
            "1. **优势 (Strengths)**：项目的核心竞争力、技术壁垒、团队优势\n"
            "2. **劣势 (Weaknesses)**：资源不足、经验欠缺、技术短板\n"
            "3. **机会 (Opportunities)**：市场趋势、政策红利、技术风口\n"
            "4. **威胁 (Threats)**：竞争对手、市场风险、技术替代\n"
            "5. **SWOT矩阵交叉分析**：SO策略（利用优势抓住机会）、WO策略（弥补劣势抓住机会）、"
            "ST策略（利用优势应对威胁）、WT策略（弥补劣势规避威胁）\n"
            "6. **行动建议**：基于SWOT分析的优先级行动清单\n\n"
            "每条分析要具体、可操作，避免泛泛而谈。如有竞争者信息，做对比分析。"
        )

        user_message = f"项目信息：\n{project_info}"
        if competitors:
            user_message += f"\n\n竞争对手信息：\n{competitors}"
        user_message += _rag_context(f"SWOT分析 竞争分析 {project_info}")

        return llm_service.chat(system_prompt=system_prompt, user_message=user_message)

    # ------------------------------------------------------------------
    # 8. Competition Advisor
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

    # ------------------------------------------------------------------
    # 9. Competition Report — 赛事分析报告
    # ------------------------------------------------------------------

    def competition_report(self, competition_info: str) -> str:
        """Generate a comprehensive competition analysis report."""
        system_prompt = (
            "你是一位资深竞赛分析师，曾为数百个高校竞赛团队提供过咨询服务。"
            "根据赛事信息，生成一份详尽的赛事分析报告（Markdown格式），包含：\n"
            "## 1. 赛事概览\n"
            "赛事定位、历史沿革、影响力评估\n\n"
            "## 2. 评审标准解读\n"
            "常见评审维度、评分权重、评委关注点\n\n"
            "## 3. 参赛建议\n"
            "选题方向、团队配置、技术栈推荐\n\n"
            "## 4. 时间规划\n"
            "备赛各阶段建议时间分配、关键里程碑\n\n"
            "## 5. 往届优秀项目特征\n"
            "获奖项目的共同特点、创新点分析\n\n"
            "## 6. 风险提示\n"
            "常见失误、避坑指南\n\n"
            "## 7. 资源推荐\n"
            "学习资料、工具平台、参考案例\n\n"
            "分析要具体、可操作，结合赛事特点给出针对性建议。"
        )

        user_message = f"赛事信息：\n{competition_info}"
        user_message += _rag_context(f"竞赛分析 参赛指南 {competition_info}")

        return llm_service.chat(system_prompt=system_prompt, user_message=user_message)


# Module-level singleton
tool_service = ToolService()


# ---------------------------------------------------------------------------
# 9. Parse Competition (standalone function, not on ToolService)
# ---------------------------------------------------------------------------

import json as _json
import re as _re

_PARSE_SYSTEM_PROMPT = """你是一个赛事信息提取助手。从用户提供的文本中提取赛事信息，返回严格的JSON格式（不要markdown代码块，直接返回JSON）。

字段说明：
- title: 赛事名称（string，必填）
- description: 赛事简介，50-200字（string，必填）
- type: 赛事类型，只能是 "hackathon"（编程/开发/设计类）、"innovation"（创新创业类）、"research"（学术/科研类）之一
- max_team_size: 最大团队人数（int，默认5）
- min_team_size: 最小团队人数（int，默认1）
- registration_deadline: 报名截止日期，ISO 8601格式，如 "2026-04-15T00:00:00Z"。如果文本中没有明确提到，设为null
- start_date: 开始日期，ISO 8601格式（必填，如果无法确定用当年合理日期）
- end_date: 结束日期，ISO 8601格式（必填）
- location: 举办地点（string）
- tags: 标签，逗号分隔（string）
- prize: 奖项设置描述（string）

如果某个字段信息不足，用合理默认值填充。type必须是三个值之一，根据内容判断。"""


def parse_competition_text(text: str) -> dict:
    """Use LLM to extract structured competition info from raw text."""
    result = llm_service.chat(
        system_prompt=_PARSE_SYSTEM_PROMPT,
        user_message=text,
        temperature=0.1,
    )
    # Strip markdown code fences if present
    cleaned = result.strip()
    cleaned = _re.sub(r'^```(?:json)?\s*', '', cleaned)
    cleaned = _re.sub(r'\s*```$', '', cleaned)
    try:
        return _json.loads(cleaned)
    except _json.JSONDecodeError:
        # Try to find JSON object in the response
        match = _re.search(r'\{.*\}', cleaned, _re.DOTALL)
        if match:
            return _json.loads(match.group())
        raise ValueError(f"LLM did not return valid JSON: {result[:200]}")
