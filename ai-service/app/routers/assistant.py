"""AI Assistant router - enhanced with tool calling capabilities."""

import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.llm_service import llm_service
from app.services.rag_service import rag_service
from app.services.ai_tools import ai_tools

logger = logging.getLogger(__name__)

router = APIRouter(tags=["assistant"])


class ChatRequest(BaseModel):
    """Chat request with role context."""
    message: str
    role: str  # "admin", "teacher", "student"
    context: Optional[str] = None  # Page context
    page: Optional[str] = None  # Current page name
    history: Optional[list[dict]] = None


class ChatResponse(BaseModel):
    """Chat response."""
    reply: str
    suggestions: list[str] = []
    data: Optional[dict] = None  # Any data returned by tools


# Tool definitions for the AI
TOOLS_DEFINITION = """
你可以使用以下工具来帮助用户：

## 查询工具
1. **get_statistics()** — 获取平台统计数据（赛事数、团队数、用户数等）
2. **get_competitions(status?, limit?)** — 获取赛事列表
3. **get_competition_detail(comp_id)** — 获取赛事详情（含团队和获奖）
4. **get_teams(status?, comp_id?)** — 获取团队列表
5. **get_pending_approvals()** — 获取待处理审批
6. **get_pre_plans(status?)** — 获取预计划列表
7. **get_evaluations(teacher_id?)** — 获取学生评价
8. **get_teacher_performance(teacher_id?)** — 获取教师表现数据

## 操作工具
9. **approve_workflow(workflow_id, comment?)** — 审批通过
10. **reject_workflow(workflow_id, comment?)** — 审批驳回
11. **generate_report(report_type)** — 生成报告

## 使用方式
当你需要使用工具时，请用以下格式：
```tool
工具名(参数1, 参数2)
```

例如：
```tool
get_statistics()
get_competitions(status="ongoing")
approve_workflow(workflow_id=1, comment="同意")
```

注意：先查询数据再回答，不要编造数据。
"""

# Role-specific system prompts
SYSTEM_PROMPTS = {
    "admin": f"""你是一个专业的竞赛管理平台 AI 助手，专门为管理员提供支持。

{TOOLS_DEFINITION}

你的能力：
1. 数据分析 — 查询并分析赛事、团队、审批数据
2. 审批建议 — 查看待处理审批，给出建议
3. 报告生成 — 生成各类统计报告
4. 执行操作 — 帮助管理员执行审批等操作

回复要求：
- 使用中文回复
- 先查询数据，再基于数据回答
- 提供具体可执行的建议
- 涉及数据时给出具体数字
- 重要建议用列表形式展示
- 如果用户要求执行操作，先确认再执行""",

    "teacher": f"""你是一个专业的竞赛管理平台 AI 助手，专门为指导教师提供支持。

{TOOLS_DEFINITION}

你的能力：
1. 数据查询 — 查看团队、预计划、评价数据
2. 审核建议 — 帮助分析预计划，给出审核意见
3. 学生反馈 — 帮助生成学生指导反馈
4. 团队分析 — 分析团队表现和改进方向

回复要求：
- 使用中文回复
- 专业且有建设性
- 关注学生成长和项目质量
- 提供具体的改进建议""",

    "student": f"""你是一个专业的竞赛管理平台 AI 助手，专门为参赛学生提供支持。

{TOOLS_DEFINITION}

你的能力：
1. 数据查询 — 查看赛事、团队、预计划信息
2. 项目改进 — 分析项目优缺点，给出改进建议
3. 商业计划 — 帮助撰写和优化商业计划书
4. 技术路线 — 推荐技术栈和架构方案

回复要求：
- 使用中文回复
- 通俗易懂，鼓励为主
- 提供具体可操作的建议
- 结合往届优秀案例""",
}

# Page-specific context prompts
PAGE_CONTEXTS = {
    "dashboard": "用户当前在仪表盘页面，可能需要了解整体概况或快速操作。",
    "competitions": "用户当前在赛事管理页面，可能需要查看赛事信息或进行赛事相关操作。",
    "teams": "用户当前在团队管理页面，可能需要查看团队信息或管理团队。",
    "approvals": "用户当前在审批中心，可能需要查看或处理审批。",
    "preplans": "用户当前在预计划页面，可能需要查看或提交预计划。",
    "awards": "用户当前在获奖管理页面，可能需要查看获奖信息。",
    "evaluations": "用户当前在评价页面，可能需要查看或提交评价。",
    "stats": "用户当前在统计分析页面，可能需要数据分析支持。",
    "aitools": "用户当前在 AI 工具页面，可能需要使用 AI 工具。",
}


def _execute_tool(tool_call: str) -> dict:
    """Parse and execute a tool call."""
    try:
        # Parse tool call: tool_name(param1, param2)
        import re
        match = re.match(r'(\w+)\((.*?)\)', tool_call.strip())
        if not match:
            return {"error": "Invalid tool call format"}

        tool_name = match.group(1)
        args_str = match.group(2)

        # Parse arguments
        kwargs = {}
        if args_str:
            # Simple argument parsing
            for arg in args_str.split(','):
                arg = arg.strip()
                if '=' in arg:
                    key, value = arg.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    # Convert types
                    if value.isdigit():
                        kwargs[key] = int(value)
                    elif value in ('true', 'false'):
                        kwargs[key] = value == 'true'
                    else:
                        kwargs[key] = value
                else:
                    # Positional argument
                    if arg.isdigit():
                        kwargs.setdefault('_pos', []).append(int(arg))

        # Execute tool
        tool_func = getattr(ai_tools, tool_name, None)
        if not tool_func:
            return {"error": f"Unknown tool: {tool_name}"}

        result = tool_func(**kwargs)
        return result

    except Exception as e:
        logger.error(f"Tool execution error: {e}")
        return {"error": str(e)}


def _process_ai_response(response: str) -> tuple[str, list[dict]]:
    """Extract tool calls from AI response and execute them."""
    import re

    tool_calls = re.findall(r'```tool\n(.*?)\n```', response, re.DOTALL)
    results = []

    for tool_call in tool_calls:
        result = _execute_tool(tool_call)
        results.append({"call": tool_call, "result": result})

    # Remove tool calls from response
    clean_response = re.sub(r'```tool\n.*?\n```', '', response, flags=re.DOTALL).strip()

    return clean_response, results


@router.post("/chat")
async def chat(body: ChatRequest) -> dict:
    """AI assistant chat endpoint with tool calling."""

    if body.role not in SYSTEM_PROMPTS:
        raise HTTPException(status_code=400, detail=f"Invalid role: {body.role}")

    system_prompt = SYSTEM_PROMPTS[body.role]

    # Add page context
    if body.page and body.page in PAGE_CONTEXTS:
        system_prompt += f"\n\n当前页面上下文：{PAGE_CONTEXTS[body.page]}"

    # Build user message
    user_message = body.message
    if body.context:
        user_message = f"页面上下文：\n{body.context}\n\n用户问题：{body.message}"

    # First AI call - may include tool calls
    try:
        response = llm_service.chat(
            system_prompt=system_prompt,
            user_message=user_message,
            temperature=0.7,
        )
    except Exception as e:
        logger.error(f"LLM chat failed: {e}")
        raise HTTPException(status_code=500, detail="AI 服务暂时不可用")

    # Process tool calls
    clean_response, tool_results = _process_ai_response(response)

    # If there were tool calls, make a second call with the results
    if tool_results:
        tool_context = "\n\n工具执行结果：\n"
        for tr in tool_results:
            tool_context += f"- 调用: {tr['call']}\n- 结果: {json.dumps(tr['result'], ensure_ascii=False, indent=2)}\n"

        follow_up_message = f"{user_message}\n{tool_context}\n\n请基于以上工具返回的数据回答用户的问题。"

        try:
            final_response = llm_service.chat(
                system_prompt=system_prompt,
                user_message=follow_up_message,
                temperature=0.7,
            )
        except Exception as e:
            logger.error(f"Follow-up LLM call failed: {e}")
            final_response = clean_response
    else:
        final_response = clean_response

    # Generate suggestions
    suggestions = _get_suggestions(body.role, body.message, body.page)

    return {
        "reply": final_response,
        "suggestions": suggestions,
        "tool_calls": [{"call": tr["call"]} for tr in tool_results] if tool_results else None,
    }


@router.post("/chat/stream")
async def chat_stream(body: ChatRequest):
    """Streaming AI assistant chat endpoint."""
    from fastapi.responses import StreamingResponse

    if body.role not in SYSTEM_PROMPTS:
        raise HTTPException(status_code=400, detail=f"Invalid role: {body.role}")

    system_prompt = SYSTEM_PROMPTS[body.role]
    if body.page and body.page in PAGE_CONTEXTS:
        system_prompt += f"\n\n当前页面上下文：{PAGE_CONTEXTS[body.page]}"

    user_message = body.message
    if body.context:
        user_message = f"页面上下文：\n{body.context}\n\n用户问题：{body.message}"

    async def generate():
        try:
            for chunk in llm_service.chat_stream(
                system_prompt=system_prompt,
                user_message=user_message,
                temperature=0.7,
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: [ERROR]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.post("/quick-action")
async def quick_action(body: dict) -> dict:
    """Execute a quick action from the AI assistant."""
    action = body.get("action")
    role = body.get("role")
    params = body.get("params", {})

    if action == "get_stats":
        return ai_tools.get_statistics()
    elif action == "get_pending_approvals":
        return ai_tools.get_pending_approvals()
    elif action == "get_competitions":
        return ai_tools.get_competitions(**params)
    elif action == "get_teams":
        return ai_tools.get_teams(**params)
    elif action == "generate_report":
        return ai_tools.generate_report(params.get("type", "competition_summary"))
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")


def _get_suggestions(role: str, message: str, page: str = None) -> list[str]:
    """Generate context-aware suggestions."""

    # Page-specific suggestions
    page_suggestions = {
        "dashboard": ["查看平台统计数据", "查看待处理审批"],
        "competitions": ["查看进行中的赛事", "分析赛事参与情况"],
        "teams": ["查看团队列表", "分析团队表现"],
        "approvals": ["查看待处理审批", "批量审批建议"],
        "preplans": ["查看预计划列表", "分析预计划质量"],
        "stats": ["生成赛事报告", "分析趋势数据"],
    }

    if page and page in page_suggestions:
        return page_suggestions[page]

    # Role-specific suggestions
    suggestions = {
        "admin": ["获取平台统计数据", "查看待处理审批", "生成赛事报告"],
        "teacher": ["查看指导团队", "分析预计划质量", "查看学生评价"],
        "student": ["查看我的团队", "查看预计划状态", "获取改进建议"],
    }

    return suggestions.get(role, [])
