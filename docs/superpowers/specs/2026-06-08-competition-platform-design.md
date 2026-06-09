# Competition Management Platform Design Spec

## Overview

A comprehensive hackathon/competition management platform with AI-powered features for plan review, business plan generation, and statistical analysis. Built for solo hackathon development with AI coding assistance.

**Target users:** Students (participants), Teachers (mentors), Admins (organizers)

**Core value:** Streamline competition workflows + AI-powered intelligent assistance

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React Frontend (Vite)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Student  │  │ Teacher  │  │  Admin   │  │   AI     │           │
│  │ Portal   │  │ Portal   │  │ Portal   │  │ Assistant│           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ REST/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Go Backend (Gin/Fiber)                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │   Auth     │  │  Workflow  │  │ Competition│  │   Award    │   │
│  │  Module    │  │  Engine    │  │  Module    │  │  Module    │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                    │
│  │  Student   │  │   Stats    │  │   AI       │                    │
│  │ Evaluation │  │  Analytics │  │  Gateway   │──────────────┐     │
│  └────────────┘  └────────────┘  └────────────┘              │     │
└─────────────────────────────┬───────────────────────────────────┘     │
                              │                              │
              ┌───────────────┼───────────────┐              │
              ▼               ▼               ▼              ▼
┌──────────────────┐ ┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│   PostgreSQL     │ │    Redis     │ │  MinIO/OSS  │ │  Python AI   │
│   + pgvector     │ │   Cache      │ │  File Store │ │  Service     │
│                  │ │   Session    │ │             │ │  (FastAPI)   │
│  - Users         │ │   Rate Limit │ │  - Uploads  │ │              │
│  - Competitions  │ │   Queue      │ │  - Reports  │ │  - RAG       │
│  - Workflows     │ │              │ │  - Exports  │ │  - LLM Calls │
│  - Awards        │ │              │ │             │ │  - Embeddings│
│  - Vectors       │ │              │ │             │ │  - Analysis  │
└──────────────────┘ └──────────────┘ └─────────────┘ └──────────────┘
```

### Communication Flow

```
User Request → React → Go Backend → [Business Logic] → Python AI Service
                                    ↓
                              PostgreSQL + Redis
```

### Key Design Decisions

1. **Go handles all business logic** — auth, workflows, approvals, CRUD, statistics
2. **Python handles all AI tasks** — RAG retrieval, LLM calls, document generation, embeddings
3. **Go calls Python** via internal REST API (not gRPC — simpler for hackathon)
4. **PostgreSQL + pgvector** — single database for everything, vectors stored alongside relational data
5. **Redis** — caching hot data, session management, rate limiting AI calls
6. **React SPA** — single frontend with role-based routing

---

## Data Model

### Core Entities

#### USER
```
id, username, email, password_hash, role (student/teacher/admin),
avatar, phone, department, student_id, created_at, updated_at
```

#### COMPETITION
```
id, title, description, type (hackathon/innovation/research),
status (draft/published/ongoing/completed/cancelled),
max_team_size, min_team_size, registration_deadline,
start_date, end_date, location, organizer_id (FK→User),
rules_doc_url, created_at, updated_at
```

#### TEAM
```
id, name, competition_id, leader_id, status, created_at
```

#### TEAM_MEMBER
```
id, team_id, user_id, role (leader/member), joined_at
```

#### PRE_PLAN
```
id, competition_id, team_id, title, tech_stack,
target_audience, market_analysis, ai_review_score,
ai_review_notes, status, created_at
```

#### EXECUTION_PLAN
```
id, pre_plan_id, actual_tech, actual_progress,
deviations, ai_match_score, submitted_at
```

#### APPROVAL_WORKFLOW
```
id, type (registration/pre_plan/reward), target_id,
current_step, total_steps, status (pending/approved/rejected),
created_at, updated_at
```

#### APPROVAL_STEP
```
id, workflow_id, step_order, approver_id,
action (pending/approved/rejected), comment, acted_at
```

#### AWARD
```
id, competition_id, team_id, rank, prize_name,
prize_amount, status, settled_at, settled_by
```

#### STUDENT_EVALUATION
```
id, student_id, teacher_id, competition_id,
rating (1-5), feedback, teaching_quality,
communication, availability, created_at
```

#### AI_ANALYSIS_LOG
```
id, type (pre_plan_review/execution_match/business_plan/...),
input_data, output_data, model_used, tokens_used,
score, created_at
```

#### NOTIFICATION
```
id, user_id, type (workflow_update/ai_result/evaluation_reminder/award_settled),
title, message, read_at, created_at
```

### Enums / Constants

```go
// User roles
RoleStudent = "student"
RoleTeacher = "teacher"
RoleAdmin   = "admin"

// Competition status
CompStatusDraft      = "draft"
CompStatusPublished  = "published"
CompStatusOngoing    = "ongoing"
CompStatusCompleted  = "completed"
CompStatusCancelled  = "cancelled"

// Workflow types
WorkflowRegistration = "registration"
WorkflowPrePlan      = "pre_plan"
WorkflowReward       = "reward"

// Workflow status
WorkflowPending  = "pending"
WorkflowApproved = "approved"
WorkflowRejected = "rejected"
```

---

## Core Modules

### Module 1: Approval Workflows (审批流程)

**Three workflow types, unified engine:**

- **Registration Approval:** Student applies → Admin reviews → Approved/Rejected
- **Pre-Plan Approval:** Team submits plan → Teacher reviews → Admin final → Approved (with parallel AI review)
- **Reward Approval:** Competition ends → Admin proposes awards → Teacher confirms → Admin finalizes → Settled

**Key features:**
- Configurable step count per workflow type
- Parallel AI review (doesn't block human approval)
- Notification on status change (in-app notification + optional email)
- Full audit trail in `APPROVAL_STEP`

### Module 2: AI Intelligent Review (AI 智能审核)

**Two AI analysis flows:**

1. **Pre-Plan Review:**
   - Input: plan text + competition rules
   - RAG: find similar past projects
   - LLM: analyze feasibility, innovation, completeness
   - Output: score (0-100) + detailed feedback

2. **Execution Match:**
   - Input: pre-plan + actual execution report
   - Compare: tech stack, milestones, deliverables
   - LLM: assess deviation, explain differences
   - Output: match_score (0-100) + deviation analysis

**RAG Pipeline:**
```
Document → Chunk → Embed (OpenAI/local) → Store in pgvector
Query → Embed → Similarity Search → Context + LLM → Answer
```

### Module 3: Student Evaluation (学生评价)

**Flow:** Teacher guidance ends → System notifies student → Student fills evaluation form → Ratings stored → Aggregated teacher score computed

**Evaluation dimensions:**
- Teaching quality (教学水平) — 1-5 stars
- Communication (沟通能力) — 1-5 stars
- Availability (指导时间) — 1-5 stars
- Overall rating — 1-5 stars
- Free-text feedback

### Module 4: Award Settlement (获奖结算)

**Flow:** Competition ends → Final results uploaded → Admin proposes award list → Teacher confirms → Admin finalizes → Awards published → Statistics updated

**Key features:**
- Bulk import results (CSV/Excel)
- Auto-suggest awards based on rankings
- Teacher confirmation step
- Final settlement locks awards (immutable)

### Module 5: Statistics & Analytics (统计分析)

**Dashboard views:**
- Competition overview — total competitions, participation rate, completion rate
- Team performance — avg score, win rate, team size distribution
- Teacher effectiveness — avg student rating, guidance count, win rate
- AI usage — total AI calls, avg scores, cost tracking
- Trends — month-over-month comparisons

### Module 6: AI-Powered Tools (AI 辅助工具)

| Tool | Input | Output |
|------|-------|--------|
| Business Plan Writer | Project idea + template | Structured business plan |
| Market Analysis | Industry + target market | Market report with data |
| Improvement Suggestions | Past winning project | Improvement recommendations |
| Technical Route | Project requirements | Tech stack recommendations |
| Resource Integration | Team skills + needs | Cross-discipline matching |
| Competition Advisor | Project status | Actionable next steps |

**All tools use the same RAG pipeline:**
```
User input → RAG retrieval (past projects, docs, market data) →
LLM generation → Structured output (Markdown + JSON) → User review/edit
```

**RAG Configuration:**
- Embedding model: OpenAI `text-embedding-3-small` or local `bge-large-zh-v1.5`
- Chunk size: 512 tokens with 50 token overlap
- Vector store: pgvector (HNSW index for fast similarity search)
- Retrieval: Top-k (k=5) with cosine similarity threshold 0.7
- Supported LLM providers: Anthropic Messages API, OpenAI Chat Completion API

---

## API Design

### Go Backend API Routes

```
/api/v1
├── /auth
│   ├── POST   /login              # 登录
│   ├── POST   /register           # 注册
│   └── POST   /refresh            # 刷新token
│
├── /users
│   ├── GET    /me                 # 当前用户信息
│   ├── PUT    /me                 # 更新个人信息
│   └── GET    /:id                # 获取用户信息(管理员)
│
├── /competitions
│   ├── GET    /                   # 赛事列表(分页/筛选)
│   ├── POST   /                   # 创建赛事(管理员)
│   ├── GET    /:id                # 赛事详情
│   ├── PUT    /:id                # 更新赛事
│   └── DELETE /:id                # 删除赛事
│
├── /teams
│   ├── GET    /                   # 我的团队列表
│   ├── POST   /                   # 创建团队
│   ├── GET    /:id                # 团队详情
│   ├── PUT    /:id                # 更新团队
│   ├── POST   /:id/join           # 加入团队
│   └── DELETE /:id/leave          # 离开团队
│
├── /workflows
│   ├── GET    /                   # 我的待办审批
│   ├── POST   /                   # 发起审批
│   ├── GET    /:id                # 审批详情
│   ├── POST   /:id/approve        # 通过
│   └── POST   /:id/reject         # 驳回
│
├── /pre-plans
│   ├── GET    /                   # 预计划列表
│   ├── POST   /                   # 提交预计划
│   ├── GET    /:id                # 预计划详情
│   ├── PUT    /:id                # 更新预计划
│   └── POST   /:id/ai-review      # 触发AI审核
│
├── /execution-plans
│   ├── GET    /                   # 执行计划列表
│   ├── POST   /                   # 提交执行计划
│   └── POST   /:id/ai-match       # AI对比分析
│
├── /awards
│   ├── GET    /                   # 获奖列表
│   ├── POST   /                   # 提名获奖
│   ├── PUT    /:id                # 更新获奖
│   └── POST   /:id/settle         # 结算确认
│
├── /evaluations
│   ├── GET    /                   # 评价列表
│   ├── POST   /                   # 提交评价
│   └── GET    /teacher/:id        # 教师评价汇总
│
├── /ai-tools
│   ├── POST   /business-plan      # 商业计划书生成
│   ├── POST   /market-analysis    # 市场分析报告
│   ├── POST   /improvement        # 改进建议
│   ├── POST   /tech-route         # 技术路线建议
│   ├── POST   /resource-match     # 资源整合
│   └── POST   /advisor            # 赛事顾问
│
└── /stats
    ├── GET    /overview           # 总览数据
    ├── GET    /competitions       # 赛事统计
    ├── GET    /teams              # 团队统计
    ├── GET    /teachers           # 教师统计
    └── GET    /ai-usage           # AI使用统计
```

### Python AI Service API Routes

```
/ai/api/v1
├── /rag
│   ├── POST   /query              # RAG查询
│   ├── POST   /ingest             # 文档入库
│   └── POST   /search             # 向量搜索
│
├── /review
│   ├── POST   /pre-plan           # 预计划审核
│   └── POST   /execution-match    # 执行对比
│
├── /generate
│   ├── POST   /business-plan      # 商业计划书
│   ├── POST   /market-analysis    # 市场分析
│   ├── POST   /improvement        # 改进建议
│   ├── POST   /tech-route         # 技术路线
│   └── POST   /resource-match     # 资源匹配
│
├── /embeddings
│   ├── POST   /create             # 创建向量
│   └── POST   /batch              # 批量向量
│
└── /health
    └── GET    /                   # 健康检查
```

---

## Frontend Structure

### 已完成的前端项目结构

```
frontend/
├── index.html                    # 入口 HTML，加载 React 18 + Babel
└── platform/
    ├── data.jsx                  # Mock 数据（用户、赛事、团队、审批、获奖、评价等）
    ├── ui.jsx                    # UI 组件库（Btn, Badge, Card, Table, Modal, Toast, Stars, ProgBar 等）
    ├── layout.jsx                # 布局组件（Sidebar, TopBar, Layout, 角色导航配置）
    ├── dashboard.jsx             # 仪表盘（管理员/教师/学生三种角色）
    ├── competitions.jsx          # 赛事管理（列表、详情、筛选、搜索）
    ├── approvals.jsx             # 审批中心（审批列表、详情、AI 审核报告嵌入）
    ├── preplans.jsx              # 预计划管理（列表、详情、提交表单、AI 审核报告）
    ├── aitools.jsx               # AI 工具箱（6 个 AI 工具，流式输出）
    ├── stats.jsx                 # 统计分析（KPI 卡片、折线图、柱状图、环形图）
    ├── records.jsx               # 团队/获奖/评价管理
    └── app.jsx                   # 主应用（路由、角色切换）
```

### Role-Based Access Control (RBAC)

| Feature | Student | Teacher | Admin |
|---------|---------|---------|-------|
| View competitions | ✅ | ✅ | ✅ |
| Create/edit competitions | ❌ | ❌ | ✅ |
| Create/join teams | ✅ | ❌ | ❌ |
| Submit pre-plan | ✅ | ❌ | ❌ |
| Approve workflows | ❌ | ✅ | ✅ |
| Submit evaluation | ✅ | ❌ | ❌ |
| Use AI tools | ✅ | ✅ | ✅ |
| View statistics | Own | Own | All |
| Manage awards | ❌ | Confirm | ✅ |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + JSX + Babel | **已完成**，飞书风格 UI 组件库 |
| UI Components | Custom (Btn, Card, Table, Modal, Badge, Toast, Stars, ProgBar) | **已完成**，飞书风格，位于 `frontend/platform/ui.jsx` |
| State | React Context + useState | **已完成**，轻量级，适合当前规模 |
| Charts | Custom SVG (BarChart, LineChart, DonutChart) | **已完成**，位于 `frontend/platform/stats.jsx` |
| Backend | Go + Gin/Fiber | Fast, type-safe, great concurrency |
| AI Service | Python + FastAPI | Best AI/ML ecosystem |
| RAG | LangChain / LlamaIndex + pgvector | Mature RAG framework |
| Database | PostgreSQL + pgvector | Relational + vector in one |
| Cache | Redis | Fast, simple, great for rate limiting |
| Auth | JWT + bcrypt | Stateless, secure |
| API Docs | Swagger/OpenAPI | Auto-generated docs |
| DevOps | Docker Compose | Simple local development |

---

## Development Phases

### Phase 1: Backend Foundation (Week 1-3)
- Go backend project setup (Gin/Fiber)
- Database schema + migrations (PostgreSQL + pgvector)
- Auth system (JWT, RBAC)
- Basic CRUD APIs for Users, Competitions
- Docker Compose for local dev
- **Frontend已完成**，可直接对接 API

### Phase 2: Core Business APIs (Week 4-7)
- Team management APIs
- Competition lifecycle APIs
- Workflow engine (generic approval) APIs
- Pre-plan submission + approval flow APIs
- 对接前端 Mock 数据为真实 API

### Phase 3: AI Service (Week 8-11)
- Python AI service setup (FastAPI)
- RAG pipeline (pgvector + embeddings)
- Pre-plan AI review API
- Execution plan AI match API
- AI analysis logging
- 对接前端 AI 工具页面

### Phase 4: Complete Features (Week 12-16)
- Award settlement workflow APIs
- Student evaluation system APIs
- Statistics dashboard APIs
- All 6 AI tools APIs
- 前端对接真实数据，移除 Mock

### Phase 5: Polish & Demo (Week 17-20)
- Performance optimization
- UI/UX refinement
- Demo data seeding
- Documentation
- Demo preparation

---

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| AI quality inconsistent | RAG with curated past projects + prompt engineering |
| Too many features | Strict phase gates — each phase must be complete before next |
| Solo developer burnout | AI coding tools (Cursor, Copilot) + clear task breakdown |
| Demo day pressure | Seed data + backup plans for each feature |
| Integration complexity | API-first design — Go ↔ Python via REST |

---

## Success Metrics

1. All 6 features working — even if basic
2. AI demo impressive — live AI review with real feedback
3. Smooth workflow — approval process works end-to-end
4. Good UI — professional-looking dashboard
5. Demo data — realistic sample competitions and teams
