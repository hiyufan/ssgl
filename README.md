# SSGL 竞赛知识库平台

> 面向高校学科竞赛的全流程管理平台 — 赛事管理 · 团队协作 · AI 赋能 · 数据驱动

## 🏗️ 架构

```
┌─────────────┐    ┌─────────────┐    ┌──────────────┐
│   Frontend   │───→│  Go Backend │───→│  PostgreSQL  │
│ Vue3+Vite+   │    │   Gin+GORM  │    │   ssgl DB    │
│ Element Plus │    │   :8080     │    │              │
│  :5174       │    │             │    │              │
└──────┬───────┘    └─────────────┘    └──────────────┘
       │
       ▼
┌─────────────┐    ┌──────────────┐
│  AI Service  │───→│  PostgreSQL  │
│  FastAPI     │    │  ssgl_ai DB  │
│  :8000       │    │  + pgvector  │
└─────────────┘    └──────────────┘
```

## 🚀 功能模块

### 核心业务
- **赛事管理** — 创建/编辑/删除/发布赛事，AI 智能解析文本一键填充表单
- **团队管理** — 创建团队、加入/退出、成员管理、队长机制
- **预案管理** — 学生提交预案 → AI 评审打分 → 教师审核 → 状态流转
- **奖项管理** — 赛事结束后提名奖项 → 教师确认 → 结算
- **学生评价** — 学生对教师多维度评分（教学质量/沟通效率/响应及时）
- **审批流程** — 多级审批工作流（提交 → 审核 → 通过/驳回）
- **审计日志** — 全操作审计追踪，支持分页和统计

### AI 赋能
- **AI 工具箱** — 商业计划书、市场分析、改进方案、技术路线图、资源匹配
- **AI 答辩教练** — 选择赛事 → 模拟答辩问答 → 流式回答 → 雷达图评分 → 最终报告
- **AI 智能助手** — 全局浮动对话窗口，支持角色感知（管理员/教师/学生）
- **知识库管理** — 上传文档/文本 → 分块嵌入 → 向量搜索 → RAG 问答

### 数据看板
- **统计总览** — 赛事/团队/学生/教师数据可视化
- **角色看板** — 管理员、教师、学生各享专属仪表盘

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + TypeScript + Element Plus + Pinia + Art Design Pro |
| 后端 | Go + Gin + GORM + JWT |
| AI | FastAPI + pgvector + BGE-M3 嵌入 + OpenAI/Anthropic LLM |
| 数据库 | PostgreSQL 17 |
| 安全 | RBAC 角色权限 + 速率限制 + 安全头 + CORS + 审计日志 |

## 📦 快速启动

### 1. 数据库
```bash
# 创建数据库
createdb ssgl
createdb ssgl_ai
# 启用 pgvector 扩展 (AI 服务)
psql ssgl_ai -c "CREATE EXTENSION IF NOT EXISTS vector"
```

### 2. 后端
```bash
cd backend
# 配置 .env（参考 .env.example）
go build -o ../ssgl-server ./cmd/server
cd ..
./ssgl-server          # 启动
./ssgl-server --seed   # 启动并填充测试数据
```

### 3. AI 服务
```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 4. 前端
```bash
cd frontend-vue
pnpm install
pnpm dev --port 5174
```

> 注：`frontend-vite` 为旧版 React 前端，保留作为过渡期参考。

## 👤 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | liuzy | admin123 |

## 🧪 测试

```bash
# 运行严格自动化测试
python3 tests/test_strict.py

# 运行 Go 单元测试
cd backend && go test ./... -v
```

## 📁 项目结构

```
ssgl/
├── backend/            # Go 后端
│   ├── cmd/server/     # 入口
│   └── internal/
│       ├── config/     # 配置
│       ├── database/   # 数据库连接 + 迁移 + 种子
│       ├── handlers/   # HTTP 处理器
│       ├── middleware/  # 认证、RBAC、安全中间件
│       ├── models/     # 数据模型
│       ├── router/     # 路由配置
│       └── services/   # 业务逻辑
├── ai-service/         # Python AI 服务
│   └── app/
│       ├── routers/    # API 路由
│       ├── services/   # AI/嵌入/RAG 服务
│       └── models/     # 数据模型
├── frontend-vue/       # Vue 3 前端 (主)
│   └── src/
│       ├── api/        # API 客户端
│       ├── components/ # UI 组件
│       ├── views/      # 页面
│       ├── store/      # Pinia 状态
│       └── router/     # 路由配置
├── frontend-vite/      # React 前端 (旧，保留参考)
└── tests/              # 自动化测试
```

## 🔒 安全特性

- JWT 认证 + 自动刷新
- RBAC 角色权限（admin / teacher / student）
- 速率限制（登录/注册端点）
- 安全头（X-Content-Type-Options, X-Frame-Options）
- CORS 白名单
- SQL 注入防护（GORM 参数化查询）
- 全操作审计日志

## 📄 License

MIT
