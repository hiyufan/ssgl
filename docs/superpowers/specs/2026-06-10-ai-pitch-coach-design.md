# AI 模拟答辩 · 赛事陪练 — 设计文档

- 日期：2026-06-10
- 范围：`ai-service/`（Python AI 服务）+ `frontend-vite/`（React + Vite 前端）。**零 Go 后端、零数据库改动。**
- 状态：已与需求方逐段确认，待转实现计划
- 定位：黑客马拉松项目的**演示亮点**功能，主打评委现场冲击力

## 1. 背景与目标

竞赛管理平台的核心流程（赛事 / 团队 / 预计划 / 审批 / AI 审核 / 评价 / 获奖 / 统计）已端到端打通。
现有 AI 能力包含：带工具调用的会话助手（`assistant`）、预计划 AI 审核 + 执行计划对比（`review`）、
6 个 AI 工具（`tools`）、RAG 检索（`rag`）。

本功能新增平台目前**完全没有、又最契合黑客松场景**的能力：**AI 模拟答辩教练**。
学生在一个三幕式体验里被一组 AI 评委"盘问"——AI 读取**这支队真实的预计划 + RAG 检索到的往届相似项目**，
据此给出针对性评分、连珠炮追问、并在最后产出可带走的终评分卡。

### Wow 锚点
问题不是泛泛模板，而是基于**真实预计划 + 往届相似项目**生成，"针对这个项目、这届评委真会问的"。
这正是把只读数据接地（C 方案）融进模拟评委（A 方案）的关键。

### 目标
- 一个独立、全屏、可现场演示的「赛事陪练」体验，弧线清晰、视觉有冲击力（雷达图 + 流式问答 + 评分卡）。
- 复用现有基建：`llm_service`（双 provider 流式）、`rag_service`、`assistant` 的流式 SSE 协议与 UI 套路、forge 设计系统。
- 实现仅落在 AI 服务 + 前端，**不动 Go 后端、不做数据库迁移**，把集成风险降到最低。

### 非目标（本次不做）
- 任何 Go 后端 / 数据库 schema 改动。
- 答辩历史**持久化**（本次为内存会话，演示后即弃；持久化记为未来项）。
- 多 worker / 横向扩展下的会话共享（单进程演示足够；多 worker 时换 Redis，记为未来项）。
- 语音 / 音频输入（纯文本作答）。
- 把功能塞进现有浮动 `AIAssistant`（本次为独立页面）。

## 2. 关键决策（已确认）

| # | 取舍 | 决策 | 理由 |
|---|---|---|---|
| 1 | 功能落点 | **独立新页面**「赛事陪练」`/coach` | 全屏沉浸 > 浮动助手，演示更抓眼 |
| 2 | 会话状态 | **AI 服务内存会话**（`session_id` + TTL），**不落库** | 零 Go/DB 改动、零迁移、风险最低 |
| 3 | 评委形态 | **三人评委席**：技术 / 商业 / 产品三视角 | 戏剧性强，几乎只是提示词成本 |
| 4 | 输入源 | 既可**选已有预计划**，也可**自由粘贴 pitch** | 粘贴是 DB 空时的演示兜底 |
| 5 | 追问表示 | **in-band 文本标记**（点评末尾以「追问：」开头），非额外结构化字段 | 复用现有 SSE 流式协议，前端实现最简 |
| 6 | 前端流式 | `coachAPI.answerStream` 用**原生 `fetch` + `ReadableStream`** 读 SSE | axios 浏览器端流式不顺手；start/final 仍走 axios |

## 3. 架构

纯 **AI 服务 + 前端** 增量：

```
frontend-vite/src/
  pages/coach.tsx              (新) 三幕状态机页面：setup → opening → qa → final
  components/ai/radar.tsx      (新) 小型 SVG 蛛网/雷达图，无新依赖
  services/api.ts              (改) 新增 coachAPI（start / answerStream / final）
  App.tsx                      (改) 新增 /coach 路由
  components/layout/*          (改) 侧边栏新增「赛事陪练」入口

ai-service/app/
  routers/coach.py             (新) /coach/start、/coach/answer(流式)、/coach/final
  services/coach_service.py    (新) 编排：取预计划 → RAG → 拼提示词 → 解析结构化输出 → 管理评委席与会话
  services/ai_tools.py         (改) 新增只读 get_pre_plan_detail(pre_plan_id)
  services/llm_service.py      (改) 新增多轮 chat_messages + chat_messages_stream
  utils/prompts.py             (改) 新增 COACH_OPENING_SYSTEM / COACH_TURN_SYSTEM / COACH_FINAL_SYSTEM
  utils/json_parse.py          (新) 把 review_service._parse_json 抽出共用（coach 也要用）
  main.py                      (改) include coach.router，prefix="/ai/api/v1/coach"
```

路由前缀与现有一致（`/ai/api/v1/<name>`），前端 `AI_BASE = /ai/api/v1`，故 coach 走 `/coach/*`。

### 被否决的备选
- **塞进浮动 AIAssistant**：复用快，但挤、无法承载雷达图/评分卡的沉浸演示。否决。
- **落库持久化答辩会话**：更"真"，但需 Go 后端 + 迁移，违背"零后端改动、低风险演示"目标。否决（记为未来项）。
- **追问用额外结构化字段**：更规整，但要在流式 prose 之外混入结构化尾包，复杂且易碎。改用 in-band「追问：」标记。

## 4. 数据模型（AI 服务内存）

模块级单例字典 `_sessions: dict[str, CoachSession]`，惰性 TTL 淘汰（默认 30 分钟，按 `created_at` 判定）。

```python
@dataclass
class CoachSession:
    session_id: str
    created_at: float                 # time.time()，用于 TTL
    role: str                         # "student" | "teacher" | "admin"
    grounding: dict                   # { plan: {...}, similar_projects: [...] } 接地上下文快照
    questions: list[dict]             # [{id, persona, question, rationale}]
    transcript: list[dict]            # [{type:"answer"|"reaction", question_id, content}]
    opening_scores: dict              # 开场五维 + overall，供 final 计算 delta
```

- **单 worker 安全**（Dockerfile `uvicorn` 无 `--workers`）。多 worker 场景换 Redis（未来项）。
- 无持久化：进程重启或 TTL 过期会话即失效，前端按 404 处理（见 §7）。

## 5. AI 服务端点契约

### 5.1 `POST /coach/start` — 开场评审

```
入参:
{
  "role": "student" | "teacher" | "admin",
  "source": "pre_plan" | "text",
  "pre_plan_id": 123,          // source=pre_plan 时必填
  "pitch_text": "....",        // source=text 时必填
  "num_questions": 4           // 默认 4，范围 3–6
}

流程:
  1. source=pre_plan → ai_tools.get_pre_plan_detail(pre_plan_id)（只读，取全字段）
     source=text     → 包装成最小 plan dict: { "title": "(粘贴)", "raw": pitch_text }
  2. rag_service.search(query=plan 文本, top_k=5, threshold=0.3) 取往届相似项目
  3. llm_service.chat(system=COACH_OPENING_SYSTEM, user=拼好的 plan + 相似项目) → JSON
  4. 解析 JSON（utils.json_parse），创建 CoachSession，存接地上下文 + 问题队列 + 开场分

出参:
{
  "session_id": "uuid",
  "scores": { "innovation": 0-100, "feasibility": 0-100, "business": 0-100,
              "delivery": 0-100, "completeness": 0-100 },
  "overall": 0-100,
  "verdict": "一句话定调",
  "similar_projects": [{ "id", "preview", "similarity" }],
  "questions": [{ "id": 1, "persona": "tech"|"business"|"product",
                  "question": "...", "rationale": "为什么问（基于计划哪段/哪个相似项目）" }]
}
```

> 完整问题列表一次返回，便于前端展示进度；但作答按题逐个进行（见 5.2）。

### 5.2 `POST /coach/answer` — 答辩问答（SSE 流式）

复用现有 `assistant/chat/stream` 的 SSE 协议：`data: <chunk>\n\n` … `data: [DONE]\n\n`，错误 `data: [ERROR]\n\n`。

```
入参: { "session_id", "question_id", "answer" }

流程:
  1. 取会话；找不到/过期 → 404
  2. 追加 {type:"answer", question_id, content:answer} 到 transcript
  3. 取当前题的 persona，注入 COACH_TURN_SYSTEM（评委人设 + 接地摘要）
  4. 用 transcript（压缩）构造 messages，chat_messages_stream 流式吐出该评委对此回答的点评
  5. 流结束后把完整点评追加为 {type:"reaction", question_id, content}

追问约定（in-band）:
  - 提示词要求：「若回答有明显漏洞，在点评末尾另起一行，以『追问：』开头追加一个深挖问题」
  - 前端检测到「追问：」→ 提供"继续回答"（沿用同一 question_id 再答一次）
  - 否则 → 进入下一题
  - 限制：每个基础题最多 1 次追问（前端侧计数控制），避免无限循环
```

### 5.3 `POST /coach/final` — 终评分卡

```
入参: { "session_id" }

流程: 取会话 transcript + 接地上下文 → llm_service.chat(system=COACH_FINAL_SYSTEM, ...) → JSON

出参:
{
  "scores": { 五维同上 },
  "overall": 0-100,
  "highlights": ["..."],
  "improvements": [{ "priority": "high"|"medium", "content": "..." }],
  "closing": "一句话寄语",
  "delta": { "innovation": +5, ... }   // 相对开场分的增减，雷达叠加用；不可得时省略
}

收尾: 返回后可即时淘汰该 session（或留待 TTL）。
```

## 6. 支撑性改动（小而有界）

### 6.1 `llm_service.py`
新增两个方法，与现有 `chat` / `chat_stream` 对称，仅把"单条 user"换成"消息数组"：
- `chat_messages(system_prompt: str, messages: list[dict], temperature=0.7) -> str`
- `chat_messages_stream(system_prompt: str, messages: list[dict], temperature=0.7) -> Generator/AsyncGenerator`

OpenAI 分支：`messages=[{system}] + messages`；Anthropic 分支：`system=system_prompt, messages=messages`。
`messages` 元素形如 `{ "role": "user"|"assistant", "content": str }`。

### 6.2 `ai_tools.py`
新增只读工具，沿用现有 `engine.begin()` + `text()` 写法：
```python
def get_pre_plan_detail(self, pre_plan_id: int) -> dict:
    """取预计划全文（title, tech_stack, target_audience, market_analysis,
    innovation, expected_outcome, timeline, status, ai_review_score）+ 队名 + 赛事名。"""
```
找不到返回 `{"error": "Pre-plan not found"}`。

### 6.3 `utils/json_parse.py`
把 `review_service._parse_json` 原样抽到 `utils/json_parse.py` 共用；`review_service` 改为 import。
三级兜底：直接 `json.loads` → 去 ```fence → 抓首个 `{...}`。

### 6.4 `utils/prompts.py`
新增三套系统提示词：
- `COACH_OPENING_SYSTEM`：要求严格输出 §5.1 的 JSON；五维 0–100；问题带 persona 与 rationale；问题须引用计划具体内容。
- `COACH_TURN_SYSTEM`：注入当前评委人设（技术/商业/产品），对学生回答做简短犀利点评；按 in-band 约定决定是否「追问：」。
- `COACH_FINAL_SYSTEM`：要求严格输出 §5.3 的 JSON 终评分卡。

### 6.5 `main.py`
`app.include_router(coach.router, prefix="/ai/api/v1/coach")`。

## 7. 前端规格

### 7.1 `pages/coach.tsx` — 三幕状态机
状态：`setup → opening → qa → final`。
- **setup**：来源切换（「我的预计划」下拉，数据来自 `prePlansAPI.list()` / 「自由粘贴」textarea）+ 题量选择（3–6）+ 「开始答辩」。
- **opening**：`radar` 五维雷达 + overall 环 + `verdict` + 相似项目 chips + 「进入答辩」。
- **qa**：当前题（persona 色标徽章：技术=violet / 商业=accent / 产品=emerald）+ 作答 textarea + 流式点评气泡 + 进度（如 3/4）+ 追问处理 + 「下一题 / 结束答辩」。
- **final**：终评分卡（雷达叠加"开场 vs 终评"用 `delta`）+ 亮点 + 改进清单（按 priority）+ 寄语 + 「再来一次」。

### 7.2 `components/ai/radar.tsx`
自绘 SVG 蛛网图，`props: { dims: {label, value}[]; compareValues?: number[] }`，**不引新依赖**，配色用 forge CSS 变量。

### 7.3 `services/api.ts` — `coachAPI`
- `start(payload) => Promise<CoachStart>`：走 axios（`aiApi`）。
- `final(payload) => Promise<CoachFinal>`：走 axios（`aiApi`）。
- `answerStream(payload, { onChunk, onDone, onError })`：用原生 `fetch(AI_BASE + '/coach/answer', {...})` 读 `ReadableStream`，按 `data: ` 行解析，遇 `[DONE]`/`[ERROR]` 收尾；**手动附带 auth header**（与 `aiApi` 一致的 token 来源）。

### 7.4 路由与导航
- `App.tsx` 新增 `/coach` 路由。
- 侧边栏新增「赛事陪练」入口（图标如 `Mic` / `Gavel`），三角色可见、student 主用。

## 8. 容错（"演示永不卡死"原则）

| 场景 | 处理 |
|---|---|
| LLM 返回非法 JSON | `utils.json_parse` 三级兜底；仍失败 → 返回带 `error` 标记的降级评分卡，前端 toast + 「重试」 |
| 流式中断 | 沿用 `data: [ERROR]`；前端在点评气泡内联报错，**保留已有 transcript**，可重答 |
| session 过期 / 找不到 | 404 → 前端回 `setup` + toast「答辩会话已过期，请重新开始」 |
| RAG 无往届数据 | 照常进行，标注「无往届参考」；问题以预计划本身接地 |
| 预计划字段稀疏 / 粘贴文本很短 | 开场提示词容忍稀疏输入，不报错 |
| AI 服务未启动 | 沿用现有文案「请确保 AI 服务已启动（端口 8000）」 |

## 9. 测试

- **必做**：
  - 前端 `tsc --noEmit` + `eslint`（均已配置）。
  - **端到端手动冒烟**（连本地 AI 服务），跑完整三幕各一次：① 选已有预计划 ② 自由粘贴；确认开场评分/流式问答/追问/终评全链路正常。
- **可选**（AI 服务现无 pytest，与既有 spec 一致）：若补，加 `pytest`，对 `coach_service` 提示词拼装 + `utils.json_parse` 在样例 LLM 输出上做单测（mock `llm_service`），并对 `/coach/start` 出参形状做契约测试。

## 10. 演示脚本（彩排要点）

1. 预先挑/seed 一份技术+商业点都全的预计划（能问出好问题），并备一段**粘贴版 pitch 兜底**。
2. 开场前**预热 AI 服务**（先发一次请求，避免冷启动延迟）。
3. 现场弧线：选预计划 → 开场雷达 + 一句话定调（评委"开盘"）→ 三评委连珠炮、流式点评、演示一次「追问」→ 终评分卡叠加开场雷达看成长 → 截图带走。

## 11. 受影响文件清单

新增：
- `ai-service/app/routers/coach.py`
- `ai-service/app/services/coach_service.py`
- `ai-service/app/utils/json_parse.py`
- `frontend-vite/src/pages/coach.tsx`
- `frontend-vite/src/components/ai/radar.tsx`

修改：
- `ai-service/app/services/llm_service.py`（多轮 chat_messages / chat_messages_stream）
- `ai-service/app/services/ai_tools.py`（只读 get_pre_plan_detail）
- `ai-service/app/services/review_service.py`（改用 utils.json_parse）
- `ai-service/app/utils/prompts.py`（三套 coach 提示词）
- `ai-service/app/main.py`（挂载 coach 路由）
- `frontend-vite/src/services/api.ts`（coachAPI）
- `frontend-vite/src/App.tsx`（/coach 路由）
- `frontend-vite/src/components/layout/*`（侧边栏入口）
