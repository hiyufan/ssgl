# AI 模拟答辩·赛事陪练 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增一个三幕式「AI 模拟答辩·赛事陪练」功能：读取真实预计划 + RAG 往届相似项目，由三人 AI 评委席给出开场评分、流式连珠炮追问、终评分卡。

**Architecture:** 纯 AI 服务（Python/FastAPI）+ 前端（React/Vite/TS）增量，**零 Go 后端 / 零数据库改动**。后端新增 `/ai/api/v1/coach/{start,answer,final}` 三端点，会话存于 AI 服务内存（单进程、TTL）。前端新增 `/coach` 页面（状态机）+ SVG 雷达图，流式问答用原生 `fetch` 读 SSE。复用现有 `llm_service`、`rag_service`、forge 设计系统、SSE 协议（`data:`/`[DONE]`/`[ERROR]`）。

**Tech Stack:** Python 3.11 · FastAPI · SQLAlchemy(`text`) · pgvector(已封装在 rag_service) · OpenAI/Anthropic SDK（已封装在 llm_service） · React 18 · TypeScript · Vite · axios · 原生 fetch streaming。

**设计依据：** `docs/superpowers/specs/2026-06-10-ai-pitch-coach-design.md`（已确认）。

**测试约定（重要）：** 本仓库现无任何测试框架；已确认的 spec 将 AI 服务 pytest 列为可选、必做项为前端 `tsc/eslint` + 端到端手动冒烟。本计划折中：**对 AI 服务里"纯逻辑"单元（JSON 解析、多轮消息拼装、会话 TTL、追问解析）用 pytest 做 TDD**（便宜且最易出 bug），对依赖 LLM/DB/流式的集成部分用手动冒烟验证；前端遵循 spec（tsc + eslint + 手动冒烟，不引 Vitest）。第一个后端任务会装好 pytest。

---

## 文件结构

**AI 服务（新增）**
- `ai-service/app/utils/json_parse.py` — 共享的 LLM JSON 解析（从 review_service 抽出）
- `ai-service/app/services/coach_service.py` — 答辩编排 + 内存会话 store + 纯helper
- `ai-service/app/routers/coach.py` — 三个 HTTP 端点
- `ai-service/tests/test_json_parse.py` · `tests/test_llm_messages.py` · `tests/test_coach_service.py` — 纯逻辑单测

**AI 服务（修改）**
- `ai-service/app/services/llm_service.py` — 加 `chat_messages` / `chat_messages_stream`
- `ai-service/app/services/ai_tools.py` — 加只读 `get_pre_plan_detail`
- `ai-service/app/services/review_service.py` — 改用 `utils.json_parse`
- `ai-service/app/utils/prompts.py` — 加三套 coach 提示词
- `ai-service/app/main.py` — 挂载 coach 路由
- `ai-service/requirements.txt` — 加 `pytest`

**前端（新增）**
- `frontend-vite/src/components/ai/radar.tsx` — SVG 雷达图
- `frontend-vite/src/pages/coach.tsx` — 三幕状态机页面

**前端（修改）**
- `frontend-vite/src/services/api.ts` — 加 `coachAPI` + 类型
- `frontend-vite/src/App.tsx` — 加 `/coach` 路由
- `frontend-vite/src/components/layout/sidebar.tsx` — 三角色 NAV 加「赛事陪练」
- `frontend-vite/src/components/layout/topbar.tsx` — 标题映射加 `coach`

---

## Task 1: 共享 JSON 解析器 + pytest 脚手架

**Files:**
- Create: `ai-service/tests/test_json_parse.py`
- Create: `ai-service/app/utils/json_parse.py`
- Modify: `ai-service/app/services/review_service.py`
- Modify: `ai-service/requirements.txt`

- [ ] **Step 1: 装 pytest** — 在 `ai-service/requirements.txt` 末尾追加一行：

```
pytest==8.3.4
```

然后安装：

Run: `cd ai-service && pip install pytest==8.3.4`
Expected: 成功安装（httpx 已在 requirements 中，无需新增）。

- [ ] **Step 2: 写失败测试** — 创建 `ai-service/tests/test_json_parse.py`：

```python
from app.utils.json_parse import parse_json


def test_parses_plain_json():
    assert parse_json('{"a": 1}') == {"a": 1}


def test_strips_markdown_fence():
    raw = 'Here you go:\n```json\n{"score": 88, "ok": true}\n```\nDone.'
    assert parse_json(raw) == {"score": 88, "ok": True}


def test_finds_first_brace_block_as_last_resort():
    raw = 'noise {"x": [1,2,3]} trailing'
    assert parse_json(raw) == {"x": [1, 2, 3]}


def test_raises_on_no_json():
    import pytest
    with pytest.raises(ValueError):
        parse_json("totally not json")
```

- [ ] **Step 3: 跑测试确认失败**

Run: `cd ai-service && python -m pytest tests/test_json_parse.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.utils.json_parse'`

- [ ] **Step 4: 实现** — 创建 `ai-service/app/utils/json_parse.py`（逻辑与 `review_service._parse_json` 等价）：

```python
"""Shared helper to extract a JSON object from an LLM text response."""

import json
import re


def parse_json(text: str) -> dict:
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
```

- [ ] **Step 5: 跑测试确认通过**

Run: `cd ai-service && python -m pytest tests/test_json_parse.py -v`
Expected: 4 passed

- [ ] **Step 6: 重构 review_service 改用共享 helper** — 编辑 `ai-service/app/services/review_service.py`：

把第 8 行 import 改为追加：
```python
from app.utils.json_parse import parse_json
```
把文件内两处 `_parse_json(raw_response)` / `_parse_json(...)` 调用改为 `parse_json(...)`，并删除文件底部的 `def _parse_json(text: str) -> dict:` 整个函数定义（连同其上方 `# Helpers` 注释块到 `raise ValueError` 结束）。`import json` / `import re` 若在删除后不再被使用则一并移除（`json` 仍用于 `json.dumps`，保留；`re` 若不再用则删）。

- [ ] **Step 7: 验证 review_service 仍可导入**

Run: `cd ai-service && python -c "from app.services.review_service import review_service; print('ok')"`
Expected: 打印 `ok`，无 ImportError。

- [ ] **Step 8: 提交**

```bash
git add ai-service/requirements.txt ai-service/app/utils/json_parse.py ai-service/app/services/review_service.py ai-service/tests/test_json_parse.py
git commit -m "refactor(ai): 抽出共享 parse_json + 引入 pytest"
```

---

## Task 2: llm_service 多轮对话方法

**Files:**
- Modify: `ai-service/app/services/llm_service.py`
- Create: `ai-service/tests/test_llm_messages.py`

- [ ] **Step 1: 写失败测试**（用假 client，不联网） — 创建 `ai-service/tests/test_llm_messages.py`：

```python
from app.services.llm_service import LLMService


class _FakeOpenAIClient:
    """Mimics the openai client surface used by LLMService."""
    def __init__(self):
        self.captured = None
        self.chat = self
        self.completions = self

    def create(self, **kwargs):
        self.captured = kwargs

        class _Msg:
            content = "OPENAI_REPLY"

        class _Choice:
            message = _Msg()

        class _Resp:
            choices = [_Choice()]

        return _Resp()


def _make_service(client):
    svc = LLMService.__new__(LLMService)  # bypass __init__ (no API keys needed)
    svc._provider = "openai"
    svc._client = client
    svc._model = "test-model"
    return svc


def test_chat_messages_passes_system_then_messages():
    client = _FakeOpenAIClient()
    svc = _make_service(client)
    msgs = [
        {"role": "user", "content": "Q1"},
        {"role": "assistant", "content": "A1"},
        {"role": "user", "content": "Q2"},
    ]
    out = svc.chat_messages(system_prompt="SYS", messages=msgs, temperature=0.5)

    assert out == "OPENAI_REPLY"
    sent = client.captured["messages"]
    assert sent[0] == {"role": "system", "content": "SYS"}
    assert sent[1:] == msgs
    assert client.captured["temperature"] == 0.5
    assert client.captured["model"] == "test-model"
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ai-service && python -m pytest tests/test_llm_messages.py -v`
Expected: FAIL — `AttributeError: 'LLMService' object has no attribute 'chat_messages'`

- [ ] **Step 3: 实现** — 在 `ai-service/app/services/llm_service.py` 的 `chat` 方法之后、`chat_stream` 之前，插入两个方法（缩进在 `class LLMService` 内）：

```python
    # ------------------------------------------------------------------
    # Multi-turn chat (message array)
    # ------------------------------------------------------------------

    def chat_messages(
        self,
        system_prompt: str,
        messages: list[dict],
        temperature: float = 0.7,
    ) -> str:
        """Return a single text response given a multi-turn message array.

        ``messages`` items are ``{"role": "user"|"assistant", "content": str}``.
        """

        if self._provider == "openai":
            response = self._client.chat.completions.create(
                model=self._model,
                temperature=temperature,
                messages=[{"role": "system", "content": system_prompt}, *messages],
            )
            return response.choices[0].message.content or ""

        # Anthropic
        response = self._client.messages.create(
            model=self._model,
            max_tokens=4096,
            temperature=temperature,
            system=system_prompt,
            messages=messages,
        )
        return response.content[0].text

    def chat_messages_stream(
        self,
        system_prompt: str,
        messages: list[dict],
        temperature: float = 0.7,
    ):
        """Yield text chunks given a multi-turn message array (sync generator)."""

        if self._provider == "openai":
            stream = self._client.chat.completions.create(
                model=self._model,
                temperature=temperature,
                stream=True,
                messages=[{"role": "system", "content": system_prompt}, *messages],
            )
            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield delta.content
        else:
            with self._client.messages.stream(
                model=self._model,
                max_tokens=4096,
                temperature=temperature,
                system=system_prompt,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    yield text
```

> 注：`chat_messages_stream` 用**同步生成器**（与 coach 路由的 `StreamingResponse` 同步 `generate()` 一致；现有 `assistant.chat_stream` 在路由里也是同步迭代 `llm_service.chat_stream`）。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ai-service && python -m pytest tests/test_llm_messages.py -v`
Expected: 1 passed

- [ ] **Step 5: 提交**

```bash
git add ai-service/app/services/llm_service.py ai-service/tests/test_llm_messages.py
git commit -m "feat(ai): llm_service 支持多轮 chat_messages / 流式"
```

---

## Task 3: ai_tools 只读 get_pre_plan_detail

**Files:**
- Modify: `ai-service/app/services/ai_tools.py`

- [ ] **Step 1: 实现** — 在 `ai-service/app/services/ai_tools.py` 的 `get_pre_plans` 方法之后插入新方法（缩进在 `class AITools` 内、`# ── Action Tools` 注释之前）：

```python
    def get_pre_plan_detail(self, pre_plan_id: int) -> dict:
        """Get a single pre-plan's full content (read-only) for the pitch coach."""
        with engine.begin() as conn:
            row = conn.execute(
                text("""
                    SELECT pp.id, pp.title, pp.tech_stack, pp.target_audience,
                           pp.market_analysis, pp.innovation, pp.expected_outcome,
                           pp.timeline, pp.status, pp.ai_review_score,
                           t.name AS team_name,
                           c.title AS competition_name
                    FROM pre_plans pp
                    LEFT JOIN teams t ON pp.team_id = t.id
                    LEFT JOIN competitions c ON pp.competition_id = c.id
                    WHERE pp.id = :id
                """),
                {"id": pre_plan_id},
            ).mappings().first()

        if not row:
            return {"error": "Pre-plan not found"}
        return dict(row)
```

- [ ] **Step 2: 验证可导入且签名正确**

Run: `cd ai-service && python -c "from app.services.ai_tools import ai_tools; print(callable(ai_tools.get_pre_plan_detail))"`
Expected: 打印 `True`

- [ ] **Step 3: （可选，需本地 DB）冒烟** — 若本地 DB 已 seed，验证能取到数据：

Run: `cd ai-service && python -c "from app.services.ai_tools import ai_tools; print(ai_tools.get_pre_plan_detail(1))"`
Expected: 打印含 `title` 等键的 dict，或 `{'error': 'Pre-plan not found'}`（id 不存在时）。两者都算通过（证明 SQL 无语法错）。

- [ ] **Step 4: 提交**

```bash
git add ai-service/app/services/ai_tools.py
git commit -m "feat(ai): 加只读 get_pre_plan_detail 工具"
```

---

## Task 4: Coach 三套系统提示词

**Files:**
- Modify: `ai-service/app/utils/prompts.py`

- [ ] **Step 1: 实现** — 在 `ai-service/app/utils/prompts.py` 末尾追加：

```python
COACH_OPENING_SYSTEM = """\
你是一个竞赛答辩评审委员会的召集人。你会收到一份参赛项目的「预计划」，以及若干「往届相似项目」作为参考。

请完成两件事：
1. 从五个维度给项目打分（每项 0-100 整数）：
   - innovation 创新性、feasibility 可行性、business 商业价值、delivery 表达力（材料组织/说服力）、completeness 完整度。
2. 生成一组「答辩追问」，模拟三类评委的视角：
   - "tech" 技术评委（技术可行性/架构/难点）
   - "business" 商业评委（市场/盈利/竞争）
   - "product" 产品评委（用户价值/体验/落地）
   每个问题必须**针对这份预计划的具体内容或某个相似项目**，不能是泛泛模板。

你必须只输出一个 JSON 对象（不要有多余文字），严格遵循此 schema：
{
  "scores": {
    "innovation": <int 0-100>,
    "feasibility": <int 0-100>,
    "business": <int 0-100>,
    "delivery": <int 0-100>,
    "completeness": <int 0-100>
  },
  "overall": <int 0-100，五维加权综合>,
  "verdict": "<一句话定调，犀利但中肯>",
  "questions": [
    {
      "id": <int，从 1 递增>,
      "persona": "tech" | "business" | "product",
      "question": "<针对性追问>",
      "rationale": "<为什么问：引用计划的哪段或哪个相似项目>"
    }
  ]
}
问题数量等于用户要求的数量。全部用中文。
"""

COACH_TURN_SYSTEM = """\
你是竞赛答辩现场的一位评委。你的人设由下方「当前评委」给出。你会看到项目背景摘要、你刚提出的问题、以及参赛者的回答。

请用第一人称、口语化、简短犀利地点评这次回答（2-4 句）：先认可可取之处，再直指薄弱点。
如果回答有明显漏洞或回避了关键点，请在点评的**最后另起一行**，以「追问：」开头追加一个深挖问题；否则不要追问。
全部用中文，不要输出 JSON，只输出点评文本。
"""

COACH_FINAL_SYSTEM = """\
你是竞赛答辩评审委员会主席。你会看到项目背景摘要和完整的答辩问答记录。请给出最终评定。

你必须只输出一个 JSON 对象（不要有多余文字），严格遵循此 schema：
{
  "scores": {
    "innovation": <int 0-100>,
    "feasibility": <int 0-100>,
    "business": <int 0-100>,
    "delivery": <int 0-100>,
    "completeness": <int 0-100>
  },
  "overall": <int 0-100>,
  "highlights": ["<答辩中的亮点1>", "<...>"],
  "improvements": [
    {"priority": "high" | "medium", "content": "<可执行的改进建议>"}
  ],
  "closing": "<一句话寄语>"
}
全部用中文。评分应参考参赛者在答辩中的表现，可与开场分有合理增减。
"""
```

- [ ] **Step 2: 验证可导入**

Run: `cd ai-service && python -c "from app.utils.prompts import COACH_OPENING_SYSTEM, COACH_TURN_SYSTEM, COACH_FINAL_SYSTEM; print('scores' in COACH_OPENING_SYSTEM, '追问' in COACH_TURN_SYSTEM, 'closing' in COACH_FINAL_SYSTEM)"`
Expected: 打印 `True True True`

- [ ] **Step 3: 提交**

```bash
git add ai-service/app/utils/prompts.py
git commit -m "feat(ai): 加 coach 开场/单轮/终评三套提示词"
```

---

## Task 5: Coach 会话 store 与纯 helper

**Files:**
- Create: `ai-service/app/services/coach_service.py`
- Create: `ai-service/tests/test_coach_service.py`

- [ ] **Step 1: 写失败测试** — 创建 `ai-service/tests/test_coach_service.py`：

```python
import time

from app.services.coach_service import (
    CoachSession,
    SessionStore,
    build_opening_user_message,
    build_turn_messages,
    extract_followup,
)


def test_session_store_create_and_get():
    store = SessionStore(ttl_seconds=100)
    s = store.create(
        role="student",
        grounding={"plan": {"title": "X"}, "similar_projects": []},
        questions=[{"id": 1, "persona": "tech", "question": "q", "rationale": "r"}],
        opening_scores={"innovation": 50},
    )
    assert isinstance(s, CoachSession)
    got = store.get(s.session_id)
    assert got is not None
    assert got.questions[0]["question"] == "q"


def test_session_store_evicts_expired():
    store = SessionStore(ttl_seconds=0)  # everything immediately expired
    s = store.create(role="student", grounding={}, questions=[], opening_scores={})
    time.sleep(0.01)
    assert store.get(s.session_id) is None


def test_extract_followup_found():
    text = "回答不错。\n追问：你的数据来源如何保证合规？"
    assert extract_followup(text) == "你的数据来源如何保证合规？"


def test_extract_followup_absent():
    assert extract_followup("回答得很完整，没有疑问。") is None


def test_build_opening_user_message_includes_plan_and_similar():
    plan = {"title": "智能助手", "tech_stack": "React"}
    similar = [{"content": "往届项目A 做了类似的事", "similarity": 0.81}]
    msg = build_opening_user_message(plan, similar, num_questions=3)
    assert "智能助手" in msg
    assert "往届项目A" in msg
    assert "3" in msg


def test_build_turn_messages_shape():
    session = CoachSession(
        session_id="s1",
        created_at=time.time(),
        role="student",
        grounding={"plan": {"title": "T"}, "similar_projects": []},
        questions=[{"id": 1, "persona": "tech", "question": "Q1", "rationale": "r"}],
        transcript=[],
        opening_scores={},
    )
    msgs = build_turn_messages(session, question={"id": 1, "question": "Q1"}, answer="我的回答")
    assert msgs[-1]["role"] == "user"
    assert "我的回答" in msgs[-1]["content"]
    assert all(m["role"] in ("user", "assistant") for m in msgs)
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ai-service && python -m pytest tests/test_coach_service.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.coach_service'`

- [ ] **Step 3: 实现纯逻辑部分** — 创建 `ai-service/app/services/coach_service.py`（本任务只写到 helper + store + service 单例的纯部分；LLM 编排方法在 Task 6 加入）：

```python
"""AI pitch-coach (模拟答辩) orchestration + in-memory session store."""

import json
import time
import uuid
from dataclasses import dataclass, field

PERSONA_LABEL = {"tech": "技术评委", "business": "商业评委", "product": "产品评委"}


@dataclass
class CoachSession:
    session_id: str
    created_at: float
    role: str
    grounding: dict                       # {"plan": {...}, "similar_projects": [...]}
    questions: list[dict]                 # [{id, persona, question, rationale}]
    transcript: list[dict] = field(default_factory=list)  # [{type, question_id, persona?, content}]
    opening_scores: dict = field(default_factory=dict)


class SessionStore:
    """Process-local session store with lazy TTL eviction (single-worker only)."""

    def __init__(self, ttl_seconds: int = 1800):
        self._ttl = ttl_seconds
        self._sessions: dict[str, CoachSession] = {}

    def create(self, role: str, grounding: dict, questions: list[dict],
               opening_scores: dict) -> CoachSession:
        self._evict_expired()
        sid = uuid.uuid4().hex
        session = CoachSession(
            session_id=sid,
            created_at=time.time(),
            role=role,
            grounding=grounding,
            questions=questions,
            opening_scores=opening_scores,
        )
        self._sessions[sid] = session
        return session

    def get(self, session_id: str) -> CoachSession | None:
        self._evict_expired()
        return self._sessions.get(session_id)

    def drop(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    def _evict_expired(self) -> None:
        now = time.time()
        expired = [sid for sid, s in self._sessions.items()
                   if now - s.created_at > self._ttl]
        for sid in expired:
            self._sessions.pop(sid, None)


def _plan_to_text(plan: dict) -> str:
    return json.dumps(plan, ensure_ascii=False, indent=2)


def summarize_grounding(grounding: dict) -> str:
    """Compact background summary injected into each answer turn."""
    plan = grounding.get("plan", {})
    title = plan.get("title", "(未命名项目)")
    parts = [f"项目标题：{title}"]
    for key, label in (
        ("tech_stack", "技术栈"), ("innovation", "创新点"),
        ("target_audience", "目标用户"), ("market_analysis", "市场分析"),
    ):
        val = plan.get(key)
        if val:
            parts.append(f"{label}：{val}")
    return "\n".join(parts)


def build_opening_user_message(plan: dict, similar_projects: list[dict],
                               num_questions: int) -> str:
    if similar_projects:
        sim = "\n\n".join(
            f"[相似项目{i}] (相似度 {d.get('similarity', 0):.2f})\n{d.get('content', '')}"
            for i, d in enumerate(similar_projects, start=1)
        )
    else:
        sim = "（无往届参考）"
    return (
        f"## 项目预计划\n\n```json\n{_plan_to_text(plan)}\n```\n\n"
        f"## 往届相似项目\n\n{sim}\n\n"
        f"请评审上面的预计划，并生成 {num_questions} 个针对性的答辩追问。"
    )


def build_turn_messages(session: CoachSession, question: dict, answer: str) -> list[dict]:
    """Construct the multi-turn message array for one answer turn."""
    messages: list[dict] = [
        {"role": "user", "content": f"【项目背景】\n{summarize_grounding(session.grounding)}"}
    ]
    # Replay prior Q/A so the judge has context
    for item in session.transcript:
        if item["type"] == "question":
            messages.append({"role": "assistant", "content": f"评委提问：{item['content']}"})
        elif item["type"] == "answer":
            messages.append({"role": "user", "content": f"参赛者回答：{item['content']}"})
        elif item["type"] == "reaction":
            messages.append({"role": "assistant", "content": item["content"]})
    messages.append({"role": "assistant", "content": f"评委提问：{question['question']}"})
    messages.append({"role": "user", "content": f"参赛者回答：{answer}"})
    return messages


def extract_followup(reaction_text: str) -> str | None:
    """Return the follow-up question if the reaction ends with a 「追问：」line."""
    for line in reaction_text.splitlines():
        stripped = line.strip()
        if stripped.startswith("追问："):
            q = stripped[len("追问："):].strip()
            return q or None
    return None
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ai-service && python -m pytest tests/test_coach_service.py -v`
Expected: 6 passed

- [ ] **Step 5: 提交**

```bash
git add ai-service/app/services/coach_service.py ai-service/tests/test_coach_service.py
git commit -m "feat(ai): coach 会话 store 与纯逻辑 helper（TDD）"
```

---

## Task 6: Coach LLM 编排方法

**Files:**
- Modify: `ai-service/app/services/coach_service.py`

- [ ] **Step 1: 实现** — 在 `ai-service/app/services/coach_service.py` 顶部 import 区补充：

```python
from app.services.ai_tools import ai_tools
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service
from app.utils.json_parse import parse_json
from app.utils.prompts import (
    COACH_FINAL_SYSTEM,
    COACH_OPENING_SYSTEM,
    COACH_TURN_SYSTEM,
)
```

然后在文件**末尾**追加编排服务类与单例：

```python
class CoachService:
    """High-level orchestration for the pitch-coach flow."""

    def __init__(self, store: SessionStore):
        self.store = store

    # -- Act 1: opening review -------------------------------------------
    def start(self, *, role: str, source: str, pre_plan_id: int | None,
              pitch_text: str | None, num_questions: int) -> dict:
        # 1. Resolve the plan dict
        if source == "pre_plan":
            plan = ai_tools.get_pre_plan_detail(pre_plan_id)
            if plan.get("error"):
                raise ValueError("找不到该预计划")
        else:
            plan = {"title": "(粘贴的 Pitch)", "raw": pitch_text or ""}

        # 2. Retrieve similar past projects (RAG)
        query_text = json.dumps(plan, ensure_ascii=False)
        try:
            similar = rag_service.search(query_text, top_k=5, threshold=0.3)
        except Exception:
            similar = []

        # 3. LLM opening review
        raw = llm_service.chat(
            system_prompt=COACH_OPENING_SYSTEM,
            user_message=build_opening_user_message(plan, similar, num_questions),
        )
        result = parse_json(raw)

        questions = result.get("questions", [])
        scores = result.get("scores", {})

        # 4. Create session
        session = self.store.create(
            role=role,
            grounding={"plan": plan, "similar_projects": similar},
            questions=questions,
            opening_scores=scores,
        )

        return {
            "session_id": session.session_id,
            "scores": scores,
            "overall": result.get("overall", 0),
            "verdict": result.get("verdict", ""),
            "similar_projects": [
                {"id": d.get("id"), "preview": (d.get("content") or "")[:120],
                 "similarity": d.get("similarity", 0)}
                for d in similar
            ],
            "questions": questions,
        }

    # -- Act 2: one answer turn (streaming) ------------------------------
    def answer_stream(self, *, session_id: str, question_id: int, answer: str):
        """Yield reaction text chunks; records transcript when complete.

        Raises KeyError if the session is missing/expired.
        """
        session = self.store.get(session_id)
        if session is None:
            raise KeyError("session not found")

        question = next((q for q in session.questions if q.get("id") == question_id),
                        {"id": question_id, "question": "(追问)"})

        # Record the question (once) + the answer
        session.transcript.append(
            {"type": "question", "question_id": question_id,
             "persona": question.get("persona"), "content": question["question"]}
        )
        session.transcript.append(
            {"type": "answer", "question_id": question_id, "content": answer}
        )

        persona_label = PERSONA_LABEL.get(question.get("persona", ""), "评委")
        system = f"{COACH_TURN_SYSTEM}\n\n【当前评委】你现在是「{persona_label}」。"
        messages = build_turn_messages(session, question, answer)

        collected: list[str] = []
        for chunk in llm_service.chat_messages_stream(
            system_prompt=system, messages=messages
        ):
            collected.append(chunk)
            yield chunk

        session.transcript.append(
            {"type": "reaction", "question_id": question_id,
             "persona": question.get("persona"), "content": "".join(collected)}
        )

    # -- Act 3: final scorecard ------------------------------------------
    def final(self, *, session_id: str) -> dict:
        session = self.store.get(session_id)
        if session is None:
            raise KeyError("session not found")

        transcript_text = "\n".join(
            (f"评委提问：{it['content']}" if it["type"] == "question"
             else f"参赛者回答：{it['content']}" if it["type"] == "answer"
             else f"评委点评：{it['content']}")
            for it in session.transcript
        )
        user_message = (
            f"## 项目背景\n\n{summarize_grounding(session.grounding)}\n\n"
            f"## 答辩记录\n\n{transcript_text or '（无问答记录）'}\n\n"
            "请给出最终评定。"
        )
        raw = llm_service.chat(system_prompt=COACH_FINAL_SYSTEM, user_message=user_message)
        result = parse_json(raw)
        self.store.drop(session_id)
        return result


# Module-level singletons
session_store = SessionStore(ttl_seconds=1800)
coach_service = CoachService(session_store)
```

- [ ] **Step 2: 验证可导入且不破坏已有纯逻辑测试**

Run: `cd ai-service && python -c "from app.services.coach_service import coach_service; print('ok')" && python -m pytest tests/ -q`
Expected: 打印 `ok`；全部 pytest 通过（11 passed）。

- [ ] **Step 3: 提交**

```bash
git add ai-service/app/services/coach_service.py
git commit -m "feat(ai): coach LLM 编排（开场/流式问答/终评）"
```

---

## Task 7: Coach 路由 + 挂载到 main

**Files:**
- Create: `ai-service/app/routers/coach.py`
- Modify: `ai-service/app/main.py`

- [ ] **Step 1: 实现路由** — 创建 `ai-service/app/routers/coach.py`：

```python
"""Pitch-coach (模拟答辩) router."""

import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from app.services.coach_service import coach_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["coach"])


class StartRequest(BaseModel):
    role: str = "student"
    source: str  # "pre_plan" | "text"
    pre_plan_id: Optional[int] = None
    pitch_text: Optional[str] = None
    num_questions: int = 4


class AnswerRequest(BaseModel):
    session_id: str
    question_id: int
    answer: str


class FinalRequest(BaseModel):
    session_id: str


@router.post("/start")
async def start(body: StartRequest) -> dict:
    if body.source not in ("pre_plan", "text"):
        raise HTTPException(status_code=400, detail="source 必须是 pre_plan 或 text")
    if body.source == "pre_plan" and not body.pre_plan_id:
        raise HTTPException(status_code=400, detail="缺少 pre_plan_id")
    if body.source == "text" and not (body.pitch_text or "").strip():
        raise HTTPException(status_code=400, detail="缺少 pitch_text")

    try:
        return coach_service.start(
            role=body.role,
            source=body.source,
            pre_plan_id=body.pre_plan_id,
            pitch_text=body.pitch_text,
            num_questions=max(3, min(body.num_questions, 6)),
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"coach.start failed: {e}")
        raise HTTPException(status_code=500, detail="AI 服务暂时不可用")


@router.post("/answer")
async def answer(body: AnswerRequest):
    def generate():
        try:
            for chunk in coach_service.answer_stream(
                session_id=body.session_id,
                question_id=body.question_id,
                answer=body.answer,
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"
        except KeyError:
            yield "data: [EXPIRED]\n\n"
        except Exception as e:
            logger.error(f"coach.answer stream error: {e}")
            yield "data: [ERROR]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.post("/final")
async def final(body: FinalRequest) -> dict:
    try:
        return coach_service.final(session_id=body.session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="答辩会话已过期")
    except Exception as e:
        logger.error(f"coach.final failed: {e}")
        raise HTTPException(status_code=500, detail="AI 服务暂时不可用")
```

> 注意：流式正文可能含换行；SSE 以 `data: <chunk>\n\n` 逐块发送，前端按 `\n\n` 分隔事件、对 `data:` 前缀做**仅一次**剥离即可（见 Task 8）。`[EXPIRED]` 是会话过期的专用哨兵。

- [ ] **Step 2: 挂载路由** — 编辑 `ai-service/app/main.py`：

第 9 行 import 改为：
```python
from app.routers import health, rag, review, tools, assistant, coach
```
在第 37 行 `app.include_router(assistant...)` 之后加：
```python
app.include_router(coach.router, prefix="/ai/api/v1/coach")
```

- [ ] **Step 3: 验证应用可加载**

Run: `cd ai-service && python -c "from app.main import app; print([r.path for r in app.routes if 'coach' in r.path])"`
Expected: 打印含 `/ai/api/v1/coach/start`、`/ai/api/v1/coach/answer`、`/ai/api/v1/coach/final` 的列表。

- [ ] **Step 4: （需本地 DB + LLM key）端到端冒烟** — 启动服务并打 start 端点：

Run: `cd ai-service && uvicorn app.main:app --port 8000 &`（另开终端）
然后：
```bash
curl -s -X POST localhost:8000/ai/api/v1/coach/start \
  -H "Content-Type: application/json" \
  -d '{"role":"student","source":"text","pitch_text":"一个面向大学生的 AI 简历优化工具，用 RAG 检索往届成功简历给建议。","num_questions":3}'
```
Expected: 返回含 `session_id`、`scores`（五维）、`overall`、`verdict`、`questions`（3 个、带 persona）的 JSON。
> 若环境无 LLM key/DB，跳过此步，留待 Task 12 集成冒烟；Step 3 已证明路由装配正确。

- [ ] **Step 5: 提交**

```bash
git add ai-service/app/routers/coach.py ai-service/app/main.py
git commit -m "feat(ai): 挂载 coach 路由（start/answer 流式/final）"
```

---

## Task 8: 前端 coachAPI（含 SSE fetch reader）

**Files:**
- Modify: `frontend-vite/src/services/api.ts`

- [ ] **Step 1: 实现** — 在 `frontend-vite/src/services/api.ts` 中 `assistantAPI` 定义之后、`// RAG API` 之前插入：

```typescript
// AI Pitch Coach (模拟答辩) API
export interface CoachScores {
  innovation: number;
  feasibility: number;
  business: number;
  delivery: number;
  completeness: number;
}

export interface CoachQuestion {
  id: number;
  persona: 'tech' | 'business' | 'product';
  question: string;
  rationale: string;
}

export interface CoachStart {
  session_id: string;
  scores: CoachScores;
  overall: number;
  verdict: string;
  similar_projects: { id: number; preview: string; similarity: number }[];
  questions: CoachQuestion[];
}

export interface CoachFinal {
  scores: CoachScores;
  overall: number;
  highlights: string[];
  improvements: { priority: 'high' | 'medium'; content: string }[];
  closing: string;
}

export interface CoachStartPayload {
  role?: string;
  source: 'pre_plan' | 'text';
  pre_plan_id?: number;
  pitch_text?: string;
  num_questions?: number;
}

export const coachAPI = {
  start: async (payload: CoachStartPayload): Promise<CoachStart> => {
    const response = await aiApi.post<CoachStart>('/coach/start', payload);
    return response.data;
  },

  final: async (sessionId: string): Promise<CoachFinal> => {
    const response = await aiApi.post<CoachFinal>('/coach/final', { session_id: sessionId });
    return response.data;
  },

  // Streaming answer turn — manual SSE read (axios can't stream in-browser).
  answerStream: async (
    payload: { session_id: string; question_id: number; answer: string },
    handlers: {
      onChunk: (text: string) => void;
      onDone: () => void;
      onExpired: () => void;
      onError: (msg: string) => void;
    },
  ): Promise<void> => {
    const token = getToken();
    try {
      const res = await fetch(`${AI_BASE}/coach/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok || !res.body) {
        handlers.onError('AI 服务暂时不可用');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? ''; // keep incomplete trailing event
        for (const evt of events) {
          if (!evt.startsWith('data:')) continue;
          const data = evt.slice(5).replace(/^ /, ''); // strip "data:" + one optional space
          if (data === '[DONE]') { handlers.onDone(); return; }
          if (data === '[EXPIRED]') { handlers.onExpired(); return; }
          if (data === '[ERROR]') { handlers.onError('回答生成失败'); return; }
          handlers.onChunk(data);
        }
      }
      handlers.onDone();
    } catch {
      handlers.onError('AI 服务暂时不可用，请确保已启动（端口 8000）');
    }
  },
};
```

> `AI_BASE` 与 `getToken` 已在本文件顶部定义（第 11、14 行），可直接引用。

- [ ] **Step 2: 类型检查**

Run: `cd frontend-vite && npx tsc --noEmit`
Expected: 无错误（注意 `coachAPI` 暂未被引用不会报错；导出即可）。

- [ ] **Step 3: 提交**

```bash
git add frontend-vite/src/services/api.ts
git commit -m "feat(fe): 加 coachAPI（start/final + SSE fetch 流式）"
```

---

## Task 9: 雷达图组件

**Files:**
- Create: `frontend-vite/src/components/ai/radar.tsx`

- [ ] **Step 1: 实现** — 创建 `frontend-vite/src/components/ai/radar.tsx`：

```tsx
interface RadarDim {
  label: string;
  value: number; // 0-100
}

interface RadarProps {
  dims: RadarDim[];
  compare?: number[];      // optional overlay (e.g. opening scores), same order as dims
  size?: number;
}

/** Lightweight SVG spider/radar chart. No external deps. */
export function Radar({ dims, compare, size = 220 }: RadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 28;
  const n = dims.length;

  const pointAt = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rr = (Math.max(0, Math.min(100, value)) / 100) * r;
    return [cx + rr * Math.cos(angle), cy + rr * Math.sin(angle)] as const;
  };

  const polygon = (values: number[]) =>
    values.map((v, i) => pointAt(i, v).join(',')).join(' ');

  const rings = [25, 50, 75, 100];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* grid rings */}
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={polygon(dims.map(() => ring))}
          fill="none"
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}
      {/* axes + labels */}
      {dims.map((d, i) => {
        const [x, y] = pointAt(i, 100);
        const [lx, ly] = pointAt(i, 122);
        return (
          <g key={d.label}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />
            <text
              x={lx}
              y={ly}
              fontSize={11}
              fill="var(--text-3)"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {d.label}
            </text>
          </g>
        );
      })}
      {/* compare overlay (opening) */}
      {compare && (
        <polygon
          points={polygon(compare)}
          fill="var(--text-3)"
          fillOpacity={0.08}
          stroke="var(--text-3)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      )}
      {/* main values */}
      <polygon
        points={polygon(dims.map((d) => d.value))}
        fill="var(--purple)"
        fillOpacity={0.18}
        stroke="var(--purple)"
        strokeWidth={2}
      />
      {dims.map((d, i) => {
        const [x, y] = pointAt(i, d.value);
        return <circle key={d.label} cx={x} cy={y} r={3} fill="var(--purple)" />;
      })}
    </svg>
  );
}
```

- [ ] **Step 2: 类型检查**

Run: `cd frontend-vite && npx tsc --noEmit`
Expected: 无错误。

- [ ] **Step 3: 提交**

```bash
git add frontend-vite/src/components/ai/radar.tsx
git commit -m "feat(fe): SVG 雷达图组件"
```

---

## Task 10: Coach 页面（三幕状态机）

**Files:**
- Create: `frontend-vite/src/pages/coach.tsx`

- [ ] **Step 1: 实现** — 创建 `frontend-vite/src/pages/coach.tsx`：

```tsx
import { useEffect, useRef, useState } from 'react';
import { coachAPI, prePlansAPI, type CoachStart, type CoachFinal, type CoachQuestion } from '@/services/api';
import type { PrePlan } from '@/types';
import { useRole } from '@/hooks/use-role';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Radar } from '@/components/ai/radar';
import { toast } from '@/components/ui/toast';

const DIMS: { key: keyof CoachStart['scores']; label: string }[] = [
  { key: 'innovation', label: '创新性' },
  { key: 'feasibility', label: '可行性' },
  { key: 'business', label: '商业价值' },
  { key: 'delivery', label: '表达力' },
  { key: 'completeness', label: '完整度' },
];

const PERSONA: Record<string, { label: string; color: string; bg: string }> = {
  tech: { label: '技术评委', color: 'var(--purple)', bg: 'var(--purple-bg)' },
  business: { label: '商业评委', color: 'var(--amber)', bg: 'var(--amber-bg)' },
  product: { label: '产品评委', color: 'var(--teal)', bg: 'var(--teal-bg)' },
};

type Stage = 'setup' | 'opening' | 'qa' | 'final';
type TranscriptItem = { type: 'q' | 'a' | 'reaction'; persona?: string; text: string };

const scoresToDims = (s: CoachStart['scores']) => DIMS.map((d) => ({ label: d.label, value: s[d.key] ?? 0 }));

export function CoachPage() {
  const role = useRole();
  const [stage, setStage] = useState<Stage>('setup');

  // setup
  const [source, setSource] = useState<'pre_plan' | 'text'>('pre_plan');
  const [prePlans, setPrePlans] = useState<PrePlan[]>([]);
  const [planId, setPlanId] = useState<number | null>(null);
  const [pitchText, setPitchText] = useState('');
  const [numQuestions, setNumQuestions] = useState(4);
  const [starting, setStarting] = useState(false);

  // opening / qa
  const [openingData, setOpeningData] = useState<CoachStart | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [answer, setAnswer] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [reaction, setReaction] = useState('');
  const [followup, setFollowup] = useState<string | null>(null);
  const followupCount = useRef<Record<number, number>>({});

  // final
  const [finalData, setFinalData] = useState<CoachFinal | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (source === 'pre_plan') {
      prePlansAPI.list().then((r) => setPrePlans(r.pre_plans || [])).catch(() => setPrePlans([]));
    }
  }, [source]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript, reaction]);

  const currentQuestion: CoachQuestion | undefined = openingData?.questions[qIndex];

  const start = async () => {
    if (starting) return;
    if (source === 'pre_plan' && !planId) { toast.error('请选择一份预计划'); return; }
    if (source === 'text' && !pitchText.trim()) { toast.error('请粘贴你的 Pitch'); return; }
    setStarting(true);
    try {
      const data = await coachAPI.start({
        role,
        source,
        pre_plan_id: source === 'pre_plan' ? planId! : undefined,
        pitch_text: source === 'text' ? pitchText : undefined,
        num_questions: numQuestions,
      });
      setOpeningData(data);
      setQIndex(0);
      setTranscript([]);
      followupCount.current = {};
      setStage('opening');
    } catch (e) {
      toast.error(extractErr(e));
    } finally {
      setStarting(false);
    }
  };

  const submitAnswer = () => {
    if (!openingData || !currentQuestion || streaming || !answer.trim()) return;
    const qid = currentQuestion.id;
    const qText = followup ?? currentQuestion.question;
    const myAnswer = answer.trim();
    setTranscript((t) => [
      ...t,
      { type: 'q', persona: currentQuestion.persona, text: qText },
      { type: 'a', text: myAnswer },
    ]);
    setAnswer('');
    setReaction('');
    setStreaming(true);
    let collected = '';
    coachAPI.answerStream(
      { session_id: openingData.session_id, question_id: qid, answer: myAnswer },
      {
        onChunk: (c) => { collected += c; setReaction(collected); },
        onDone: () => {
          setStreaming(false);
          setTranscript((t) => [...t, { type: 'reaction', persona: currentQuestion.persona, text: collected }]);
          setReaction('');
          handleFollowup(qid, collected);
        },
        onExpired: () => { setStreaming(false); toast.error('答辩会话已过期，请重新开始'); resetToSetup(); },
        onError: (msg) => {
          setStreaming(false);
          setTranscript((t) => [...t, { type: 'reaction', persona: currentQuestion.persona, text: `⚠️ ${msg}` }]);
          setReaction('');
        },
      },
    );
  };

  const handleFollowup = (qid: number, reactionText: string) => {
    const m = reactionText.split('\n').map((l) => l.trim()).find((l) => l.startsWith('追问：'));
    const used = followupCount.current[qid] ?? 0;
    if (m && used < 1) {
      followupCount.current[qid] = used + 1;
      setFollowup(m.slice('追问：'.length).trim());
    } else {
      setFollowup(null);
    }
  };

  const nextQuestion = () => {
    setFollowup(null);
    if (!openingData) return;
    if (qIndex < openingData.questions.length - 1) {
      setQIndex((i) => i + 1);
    } else {
      finalize();
    }
  };

  const finalize = async () => {
    if (!openingData || finalizing) return;
    setFinalizing(true);
    setStage('final');
    try {
      const data = await coachAPI.final(openingData.session_id);
      setFinalData(data);
    } catch (e) {
      toast.error(extractErr(e));
    } finally {
      setFinalizing(false);
    }
  };

  const resetToSetup = () => {
    setStage('setup');
    setOpeningData(null);
    setFinalData(null);
    setTranscript([]);
    setReaction('');
    setFollowup(null);
    setAnswer('');
  };

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <div className="forge-page">
      <header style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--purple-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)' }}>
            <Icon name="target" size={16} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>赛事陪练</h1>
          <span className="badge badge-purple">AI 模拟答辩</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>三人 AI 评委席 · 读取真实预计划 + 往届项目 · 连珠炮追问</p>
      </header>

      {stage === 'setup' && (
        <SetupView
          source={source} setSource={setSource}
          prePlans={prePlans} planId={planId} setPlanId={setPlanId}
          pitchText={pitchText} setPitchText={setPitchText}
          numQuestions={numQuestions} setNumQuestions={setNumQuestions}
          starting={starting} onStart={start}
        />
      )}

      {stage === 'opening' && openingData && (
        <OpeningView data={openingData} onEnter={() => setStage('qa')} />
      )}

      {stage === 'qa' && openingData && currentQuestion && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-h) - 120px)' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>答辩进行中</span>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>第 {qIndex + 1} / {openingData.questions.length} 问</span>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={finalize}>结束答辩</button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {transcript.map((it, i) => <Bubble key={i} item={it} />)}
            {streaming && (
              <Bubble item={{ type: 'reaction', persona: currentQuestion.persona, text: reaction || '评委思考中…' }} />
            )}
            {!streaming && (
              <div style={{ padding: 14, borderRadius: 10, background: PERSONA[currentQuestion.persona]?.bg, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, color: PERSONA[currentQuestion.persona]?.color, background: 'var(--surface)' }}>
                    {PERSONA[currentQuestion.persona]?.label}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{followup ?? currentQuestion.question}</div>
              </div>
            )}
          </div>

          <div style={{ padding: 14, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <textarea className="forge-input" rows={3} placeholder="作答…（Ctrl+Enter 提交）" value={answer}
              disabled={streaming}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitAnswer(); }}
              style={{ resize: 'none', marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={submitAnswer} disabled={streaming || !answer.trim()}>
                {streaming ? <><Spinner size={14} /> 评委点评中…</> : <><Icon name="send" size={14} /> 提交回答</>}
              </button>
              {!streaming && transcript.length > 0 && (
                <button className="btn btn-ghost" onClick={nextQuestion}>
                  {qIndex < openingData.questions.length - 1 ? '下一问 →' : '出终评 →'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {stage === 'final' && (
        <FinalView data={finalData} loading={finalizing} opening={openingData} onRestart={resetToSetup} />
      )}
    </div>
  );
}

/* ─── Sub-views ──────────────────────────────────────── */

function SetupView(props: {
  source: 'pre_plan' | 'text'; setSource: (s: 'pre_plan' | 'text') => void;
  prePlans: PrePlan[]; planId: number | null; setPlanId: (n: number) => void;
  pitchText: string; setPitchText: (s: string) => void;
  numQuestions: number; setNumQuestions: (n: number) => void;
  starting: boolean; onStart: () => void;
}) {
  const { source, setSource, prePlans, planId, setPlanId, pitchText, setPitchText, numQuestions, setNumQuestions, starting, onStart } = props;
  return (
    <div className="card" style={{ padding: 24, maxWidth: 640 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {(['pre_plan', 'text'] as const).map((s) => (
          <button key={s} className={`btn ${source === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSource(s)}>
            {s === 'pre_plan' ? '选择我的预计划' : '自由粘贴 Pitch'}
          </button>
        ))}
      </div>

      {source === 'pre_plan' ? (
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>预计划</label>
          <select className="forge-input" value={planId ?? ''} onChange={(e) => setPlanId(Number(e.target.value))}>
            <option value="" disabled>选择一份预计划…</option>
            {prePlans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {prePlans.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>暂无预计划，可改用「自由粘贴 Pitch」。</p>}
        </div>
      ) : (
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>你的 Pitch</label>
          <textarea className="forge-input" rows={5} placeholder="用几句话描述你的项目：解决什么问题、给谁用、怎么做、创新点…" value={pitchText} onChange={(e) => setPitchText(e.target.value)} style={{ resize: 'none' }} />
        </div>
      )}

      <div style={{ marginBottom: 22 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>答辩题量：{numQuestions}</label>
        <input type="range" min={3} max={6} value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} style={{ width: 200 }} />
      </div>

      <button className="btn btn-primary" onClick={onStart} disabled={starting}>
        {starting ? <><Spinner size={14} /> 评委入场中…</> : <><Icon name="target" size={14} /> 开始答辩</>}
      </button>
    </div>
  );
}

function OpeningView({ data, onEnter }: { data: CoachStart; onEnter: () => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
      <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Radar dims={scoresToDims(data.scores)} />
        <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--purple)', marginTop: 8 }}>{data.overall}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>开场综合分</div>
      </div>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>评委开场定调</div>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 16 }}>{data.verdict}</p>
        {data.similar_projects.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>往届相似项目</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {data.similar_projects.map((s, i) => (
                <span key={i} title={s.preview} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                  相似度 {(s.similarity * 100).toFixed(0)}%
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>共 {data.questions.length} 个追问，三位评委轮流发问。</div>
        <button className="btn btn-primary" onClick={onEnter}><Icon name="right" size={14} /> 进入答辩</button>
      </div>
    </div>
  );
}

function Bubble({ item }: { item: TranscriptItem }) {
  if (item.type === 'a') {
    return (
      <div style={{ alignSelf: 'flex-end', maxWidth: '80%', padding: '10px 14px', borderRadius: 12, background: 'var(--purple)', color: '#fff', fontSize: 14, lineHeight: 1.6 }}>
        {item.text}
      </div>
    );
  }
  const meta = PERSONA[item.persona || ''] || { label: '评委', color: 'var(--text)', bg: 'var(--surface-2)' };
  const isQuestion = item.type === 'q';
  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: meta.color, marginBottom: 3 }}>{meta.label}{isQuestion ? ' · 提问' : ' · 点评'}</div>
      <div style={{ padding: '10px 14px', borderRadius: 12, background: isQuestion ? meta.bg : 'var(--surface-2)', color: 'var(--text)', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', border: '1px solid var(--border)' }}>
        {item.text}
      </div>
    </div>
  );
}

function FinalView({ data, loading, opening, onRestart }: { data: CoachFinal | null; loading: boolean; opening: CoachStart | null; onRestart: () => void }) {
  if (loading || !data) {
    return <div className="card" style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><Spinner size={18} /> 评委合议中…</div>;
  }
  const openingValues = opening ? DIMS.map((d) => opening.scores[d.key] ?? 0) : undefined;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
      <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Radar dims={scoresToDims(data.scores)} compare={openingValues} />
        <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--purple)', marginTop: 8 }}>{data.overall}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>答辩终评分</div>
        {openingValues && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>虚线 = 开场分</div>}
      </div>
      <div className="card" style={{ padding: 20 }}>
        <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.7, marginBottom: 16, fontWeight: 600 }}>{data.closing}</p>
        <Section title="答辩亮点">
          {data.highlights.map((h, i) => <li key={i} style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{h}</li>)}
        </Section>
        <Section title="改进清单">
          {data.improvements.map((im, i) => (
            <li key={i} style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8, marginRight: 6, color: im.priority === 'high' ? 'var(--red)' : 'var(--amber)', background: 'var(--surface-2)' }}>
                {im.priority === 'high' ? '高' : '中'}
              </span>
              {im.content}
            </li>
          ))}
        </Section>
        <button className="btn btn-ghost" onClick={onRestart} style={{ marginTop: 8 }}><Icon name="target" size={14} /> 再来一次</button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</ul>
    </div>
  );
}

function extractErr(e: unknown): string {
  const err = e as { response?: { data?: { detail?: string; error?: string } } };
  return err?.response?.data?.detail || err?.response?.data?.error || 'AI 服务暂时不可用，请确保已启动（端口 8000）';
}
```

> 依赖确认：`toast` 来自 `@/components/ui/toast`（前次写操作交互已建）；`Spinner`、`Icon` 已存在；`badge-purple` 若样式表无此类，会回退为无背景文字——不影响功能，Task 12 视觉走查时若需要可补 CSS（非阻塞）。

- [ ] **Step 2: 类型检查 + lint**

Run: `cd frontend-vite && npx tsc --noEmit && npx eslint src/pages/coach.tsx src/components/ai/radar.tsx`
Expected: 无错误（如 eslint 报 `no-constant-condition` 在 api.ts 的 `while(true)` 已加禁用注释；coach.tsx 应干净）。

- [ ] **Step 3: 提交**

```bash
git add frontend-vite/src/pages/coach.tsx
git commit -m "feat(fe): 赛事陪练页面（三幕状态机）"
```

---

## Task 11: 路由与导航接线

**Files:**
- Modify: `frontend-vite/src/App.tsx`
- Modify: `frontend-vite/src/components/layout/sidebar.tsx`
- Modify: `frontend-vite/src/components/layout/topbar.tsx`

- [ ] **Step 1: 加路由** — 编辑 `frontend-vite/src/App.tsx`：

在第 19 行附近 import 区加：
```tsx
import { CoachPage } from '@/pages/coach';
```
在「任意已登录角色」分组里（第 39 行 `aitools` 路由之后）加：
```tsx
        <Route path="/coach" element={<CoachPage />} />
```

- [ ] **Step 2: 加侧边栏入口** — 编辑 `frontend-vite/src/components/layout/sidebar.tsx`，在每个角色的「智能助手」分组内、`aitools` 之后加一行：

student（第 49 行 `aitools` 之后）：
```tsx
    { id: 'coach', icon: 'target', label: '赛事陪练' },
```
teacher（第 39 行 `aitools` 之后）同样加：
```tsx
    { id: 'coach', icon: 'target', label: '赛事陪练' },
```
admin（第 22 行 `aitools` 之后、`knowledge-base` 之前）同样加：
```tsx
    { id: 'coach', icon: 'target', label: '赛事陪练' },
```

- [ ] **Step 3: 加标题映射** — 编辑 `frontend-vite/src/components/layout/topbar.tsx`，在第 12-13 行的标题映射对象里加键值 `coach: '赛事陪练',`（与相邻条目同一对象内，注意逗号）。

- [ ] **Step 4: 类型检查 + lint**

Run: `cd frontend-vite && npx tsc --noEmit && npx eslint src/App.tsx src/components/layout/sidebar.tsx src/components/layout/topbar.tsx`
Expected: 无错误。

- [ ] **Step 5: 提交**

```bash
git add frontend-vite/src/App.tsx frontend-vite/src/components/layout/sidebar.tsx frontend-vite/src/components/layout/topbar.tsx
git commit -m "feat(fe): 接入 /coach 路由与侧边栏入口"
```

---

## Task 12: 端到端手动冒烟

**Files:** 无（验证任务）

前置：本地起好 PostgreSQL(+pgvector，含 seed 数据)、Go 后端、AI 服务（配好 `LLM_PROVIDER` 及对应 key）、前端 dev server。

- [ ] **Step 1: 起 AI 服务并预热**

Run: `cd ai-service && uvicorn app.main:app --port 8000`
另开终端预热：`curl -s localhost:8000/ai/api/v1/coach/start -X POST -H "Content-Type: application/json" -d '{"role":"student","source":"text","pitch_text":"测试 pitch","num_questions":3}' | head -c 200`
Expected: 返回含 `session_id` 的 JSON（首请求可能较慢，属冷启动）。

- [ ] **Step 2: 浏览器走 source=pre_plan 全流程** — 以 student 登录 → 侧边栏「赛事陪练」→ 选一份预计划 → 「开始答辩」→ 看到雷达 + 定调 → 「进入答辩」→ 作答一题，确认评委点评**流式**逐字出现 → 若出现「追问：」确认能继续作答 → 逐题走到「出终评」→ 看到终评分卡（雷达叠加开场虚线 + 亮点 + 改进清单 + 寄语）。
Expected: 全程无报错；流式可见；终评雷达显示两层。

- [ ] **Step 3: 走 source=text 兜底路径** — 回到 setup（「再来一次」）→ 切「自由粘贴 Pitch」→ 粘一段文字 → 完整走一遍。
Expected: 与 Step 2 一致，证明 DB 空/无预计划时仍可演示。

- [ ] **Step 4: 容错走查** — （a）答辩中重启 AI 服务后再提交回答 → 前端应 toast「会话已过期」并回到 setup（`[EXPIRED]` 路径）；（b）停掉 AI 服务点「开始答辩」→ toast 服务不可用文案。
Expected: 两种情况都被优雅处理，页面不白屏。

- [ ] **Step 5: 跑后端单测确认未回归**

Run: `cd ai-service && python -m pytest tests/ -q`
Expected: 全部通过（11 passed）。

- [ ] **Step 6: 最终类型检查**

Run: `cd frontend-vite && npx tsc --noEmit`
Expected: 无错误。

> 本任务无代码改动，无需提交；如冒烟中发现并修了 bug，按修复内容单独提交。

---

## 自检（Self-Review）

**Spec 覆盖核对：**
- §2 决策1 独立页面 → Task 10/11 ✅；决策2 内存会话+TTL → Task 5（SessionStore ttl=1800）✅；决策3 三评委席 → Task 4 提示词 + Task 10 PERSONA ✅；决策4 双输入源 → Task 10 SetupView + Task 7 start 校验 ✅；决策5 「追问：」in-band → Task 5 extract_followup + Task 10 handleFollowup ✅；决策6 fetch 流式 → Task 8 answerStream ✅。
- §5.1 start 契约 → Task 6 `start` 出参逐字段对应 ✅；§5.2 answer SSE + 追问 → Task 6/7/8 ✅（新增 `[EXPIRED]` 哨兵，spec §8 的"会话过期→404/回 setup"在流式场景用哨兵实现，语义一致）；§5.3 final → Task 6 `final` ✅。
- §6.1 多轮 LLM → Task 2 ✅；§6.2 get_pre_plan_detail → Task 3 ✅；§6.3 抽 json_parse → Task 1 ✅；§6.4 三提示词 → Task 4 ✅；§6.5 挂载 → Task 7 ✅。
- §7 前端（页面/雷达/coachAPI/路由/侧边栏）→ Task 8/9/10/11 ✅。
- §8 容错（非法 JSON/流断/会话过期/RAG 空/稀疏输入/服务未起）→ parse_json + `[ERROR]`/`[EXPIRED]` + try/except similar + extractErr 文案 ✅。
- §9 测试 → 后端纯逻辑 pytest（Task 1/2/5）+ 前端 tsc/eslint + 手动冒烟（Task 12）✅。

**占位符扫描：** 无 TBD/TODO；每个改代码的步骤均含完整代码与确切命令/预期。

**类型一致性核对：** `CoachScores/CoachStart/CoachQuestion/CoachFinal` 在 api.ts（Task 8）定义，coach.tsx（Task 10）按相同字段名消费；`session_id/question_id/answer` 三端点入参在路由(Task7)、service(Task6)、前端(Task8/10)一致；`extract_followup`/`handleFollowup` 均按「追问：」前缀；`scores` 五键 `innovation/feasibility/business/delivery/completeness` 在提示词(Task4)、service、前端 DIMS 全一致。

发现并修正：spec §5.2 仅描述 `[DONE]/[ERROR]`，实现额外引入 `[EXPIRED]` 区分"会话过期"以满足 §8 的过期处理——已在 Task 7 注释、Task 8 `onExpired`、Task 10 `resetToSetup` 三处闭合，无悬挂引用。
