# Python AI Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Python AI service with RAG pipeline, LLM integration, and 6 AI tools that the Go backend can call.

**Architecture:** FastAPI service with pgvector for RAG, LangChain for LLM orchestration, support for both OpenAI and Anthropic APIs. The service exposes REST APIs that the Go backend proxies to.

**Tech Stack:** Python 3.11+, FastAPI, LangChain, pgvector, psycopg2, OpenAI/Anthropic SDKs

---

## File Structure

```
ai-service/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI entry point
│   ├── config.py               # Configuration
│   ├── database.py             # PostgreSQL connection
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py          # Pydantic models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── llm_service.py      # LLM abstraction (OpenAI/Anthropic)
│   │   ├── embedding_service.py # Embedding generation
│   │   ├── rag_service.py      # RAG pipeline
│   │   ├── review_service.py   # Pre-plan & execution review
│   │   └── tool_service.py     # 6 AI tools
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── health.py           # Health check
│   │   ├── rag.py              # RAG endpoints
│   │   ├── review.py           # Review endpoints
│   │   └── tools.py            # AI tools endpoints
│   └── utils/
│       ├── __init__.py
│       └── prompts.py          # Prompt templates
├── requirements.txt
├── .env
└── Dockerfile
```

---

## Task 1: Project Setup & Dependencies

**Files:**
- Create: `ai-service/requirements.txt`
- Create: `ai-service/.env`
- Create: `ai-service/Dockerfile`
- Create: `ai-service/app/__init__.py`
- Create: `ai-service/app/config.py`

- [ ] **Step 1: Create requirements.txt**

```txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
pydantic==2.9.0
pydantic-settings==2.5.0

# Database
psycopg2-binary==2.9.9
sqlalchemy==2.0.35
pgvector==0.3.5

# LLM
openai==1.50.0
anthropic==0.34.0
langchain==0.3.0
langchain-openai==0.2.0
langchain-anthropic==0.2.0
langchain-community==0.3.0

# Embeddings
sentence-transformers==3.1.0
torch==2.4.0

# Utils
python-dotenv==1.0.1
httpx==0.27.0
numpy==1.26.4
```

- [ ] **Step 2: Create .env**

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ssgl

# LLM Provider: openai or anthropic
LLM_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Embedding
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# Service
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

- [ ] **Step 3: Create Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 4: Create config.py**

```python
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/ssgl"

    # LLM
    llm_provider: str = "openai"  # openai or anthropic
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"

    # Embedding
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    # Service
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 5: Commit**

```bash
git add ai-service/
git commit -m "chore: initialize Python AI service with FastAPI"
```

---

## Task 2: Database & Embedding Service

**Files:**
- Create: `ai-service/app/database.py`
- Create: `ai-service/app/services/embedding_service.py`

- [ ] **Step 1: Create database.py**

```python
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize pgvector extension and documents table."""
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()

    # Create documents table for RAG
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                metadata JSONB DEFAULT '{}',
                embedding vector(%d),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """ % settings.embedding_dimensions))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS documents_embedding_idx
            ON documents USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100)
        """))
        conn.commit()
```

- [ ] **Step 2: Create embedding_service.py**

```python
from openai import OpenAI
from app.config import get_settings

settings = get_settings()


class EmbeddingService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.embedding_model

    def embed(self, text: str) -> list[float]:
        """Generate embedding for a single text."""
        response = self.client.embeddings.create(
            model=self.model,
            input=text
        )
        return response.data[0].embedding

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts."""
        response = self.client.embeddings.create(
            model=self.model,
            input=texts
        )
        return [item.embedding for item in response.data]


embedding_service = EmbeddingService()
```

- [ ] **Step 3: Commit**

```bash
git add ai-service/app/database.py ai-service/app/services/embedding_service.py
git commit -m "feat: add database connection and embedding service"
```

---

## Task 3: LLM Service (OpenAI/Anthropic)

**Files:**
- Create: `ai-service/app/services/llm_service.py`

- [ ] **Step 1: Create llm_service.py**

```python
from typing import AsyncGenerator
from openai import OpenAI
import anthropic
from app.config import get_settings

settings = get_settings()


class LLMService:
    """Unified LLM interface supporting OpenAI and Anthropic."""

    def __init__(self):
        self.provider = settings.llm_provider
        if self.provider == "openai":
            self.client = OpenAI(api_key=settings.openai_api_key)
            self.model = settings.openai_model
        else:
            self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
            self.model = settings.anthropic_model

    def chat(self, system_prompt: str, user_message: str, temperature: float = 0.7) -> str:
        """Send a chat message and return the response."""
        if self.provider == "openai":
            response = self.client.chat.completions.create(
                model=self.model,
                temperature=temperature,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ]
            )
            return response.choices[0].message.content
        else:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}]
            )
            return response.content[0].text

    def chat_stream(self, system_prompt: str, user_message: str, temperature: float = 0.7) -> AsyncGenerator[str, None]:
        """Stream a chat response."""
        if self.provider == "openai":
            response = self.client.chat.completions.create(
                model=self.model,
                temperature=temperature,
                stream=True,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ]
            )
            for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        else:
            with self.client.messages.stream(
                model=self.model,
                max_tokens=4096,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}]
            ) as stream:
                for text in stream.text_stream:
                    yield text


llm_service = LLMService()
```

- [ ] **Step 2: Commit**

```bash
git add ai-service/app/services/llm_service.py
git commit -m "feat: add LLM service with OpenAI/Anthropic support"
```

---

## Task 4: RAG Service

**Files:**
- Create: `ai-service/app/services/rag_service.py`

- [ ] **Step 1: Create rag_service.py**

```python
from sqlalchemy import text
from app.database import engine
from app.services.embedding_service import embedding_service
from app.services.llm_service import llm_service


class RAGService:
    """Retrieval-Augmented Generation service using pgvector."""

    def ingest(self, content: str, metadata: dict = None) -> int:
        """Ingest a document into the vector store."""
        embedding = embedding_service.embed(content)

        with engine.connect() as conn:
            result = conn.execute(text("""
                INSERT INTO documents (content, metadata, embedding)
                VALUES (:content, :metadata, :embedding)
                RETURNING id
            """), {
                "content": content,
                "metadata": json.dumps(metadata or {}),
                "embedding": str(embedding)
            })
            conn.commit()
            return result.fetchone()[0]

    def ingest_batch(self, documents: list[dict]) -> list[int]:
        """Ingest multiple documents."""
        contents = [doc["content"] for doc in documents]
        embeddings = embedding_service.embed_batch(contents)

        ids = []
        with engine.connect() as conn:
            for doc, emb in zip(documents, embeddings):
                result = conn.execute(text("""
                    INSERT INTO documents (content, metadata, embedding)
                    VALUES (:content, :metadata, :embedding)
                    RETURNING id
                """), {
                    "content": doc["content"],
                    "metadata": json.dumps(doc.get("metadata", {})),
                    "embedding": str(emb)
                })
                ids.append(result.fetchone()[0])
            conn.commit()
        return ids

    def search(self, query: str, top_k: int = 5, threshold: float = 0.7) -> list[dict]:
        """Search for similar documents."""
        query_embedding = embedding_service.embed(query)

        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT id, content, metadata,
                       1 - (embedding <=> :query_embedding) as similarity
                FROM documents
                WHERE 1 - (embedding <=> :query_embedding) > :threshold
                ORDER BY embedding <=> :query_embedding
                LIMIT :top_k
            """), {
                "query_embedding": str(query_embedding),
                "threshold": threshold,
                "top_k": top_k
            })

            return [
                {
                    "id": row[0],
                    "content": row[1],
                    "metadata": row[2],
                    "similarity": float(row[3])
                }
                for row in result.fetchall()
            ]

    def query(self, question: str, top_k: int = 5) -> dict:
        """RAG query: retrieve context, then generate answer."""
        # Retrieve relevant documents
        docs = self.search(question, top_k=top_k)

        if not docs:
            return {
                "answer": "I don't have relevant information to answer this question.",
                "sources": []
            }

        # Build context from retrieved documents
        context = "\n\n---\n\n".join([
            f"[Source {i+1}] {doc['content']}"
            for i, doc in enumerate(docs)
        ])

        # Generate answer using LLM
        system_prompt = """You are a helpful assistant for a competition management platform.
Answer the user's question based on the provided context.
If the context doesn't contain enough information, say so.
Always cite your sources using [Source N] notation."""

        user_message = f"""Context:
{context}

Question: {question}

Please provide a comprehensive answer based on the context above."""

        answer = llm_service.chat(system_prompt, user_message)

        return {
            "answer": answer,
            "sources": [
                {
                    "id": doc["id"],
                    "content": doc["content"][:200] + "...",
                    "similarity": doc["similarity"]
                }
                for doc in docs
            ]
        }


rag_service = RAGService()

import json
```

- [ ] **Step 2: Commit**

```bash
git add ai-service/app/services/rag_service.py
git commit -m "feat: add RAG service with pgvector"
```

---

## Task 5: Review Service (AI审核)

**Files:**
- Create: `ai-service/app/services/review_service.py`
- Create: `ai-service/app/utils/prompts.py`

- [ ] **Step 1: Create prompts.py**

```python
PRE_PLAN_REVIEW_SYSTEM = """你是一个专业的竞赛项目评审专家。请对参赛团队提交的预计划进行全面评估。

评估维度：
1. 可行性 (feasibility) - 技术方案是否可行，资源是否充足
2. 创新性 (innovation) - 项目是否有创新点，与现有方案的差异
3. 完整性 (completeness) - 预计划各部分是否完整，逻辑是否清晰
4. 市场适配 (market_fit) - 市场分析是否充分，商业模式是否合理

请输出JSON格式的评估结果：
{
    "score": 0-100的综合评分,
    "breakdown": {
        "feasibility": 0-100,
        "innovation": 0-100,
        "completeness": 0-100,
        "market_fit": 0-100
    },
    "summary": "200字以内的综合评价",
    "suggestions": [
        {
            "category": "改进类别",
            "priority": "high/medium/low",
            "content": "具体改进建议"
        }
    ]
}"""

EXECUTION_MATCH_SYSTEM = """你是一个专业的项目执行评估专家。请对比团队的预计划和实际执行情况，分析偏差和执行质量。

评估维度：
1. 技术栈匹配度 - 计划与实际使用的技术栈是否一致
2. 进度匹配度 - 计划与实际的里程碑完成情况
3. 偏差分析 - 识别主要偏差并分析原因

请输出JSON格式的评估结果：
{
    "score": 0-100的匹配度评分,
    "breakdown": {
        "tech_match": 0-100,
        "progress_match": 0-100,
        "deliverable_match": 0-100
    },
    "summary": "200字以内的综合评价",
    "deviations": [
        {
            "area": "偏差领域",
            "planned": "计划内容",
            "actual": "实际情况",
            "reason": "偏差原因"
        }
    ],
    "suggestions": ["改进建议1", "改进建议2"]
}"""
```

- [ ] **Step 2: Create review_service.py**

```python
import json
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service
from app.utils.prompts import PRE_PLAN_REVIEW_SYSTEM, EXECUTION_MATCH_SYSTEM


class ReviewService:
    """AI-powered review service for pre-plans and execution plans."""

    def review_pre_plan(self, plan: dict) -> dict:
        """Review a pre-plan and return AI assessment."""
        # Search for similar past projects
        query = f"{plan.get('title', '')} {plan.get('tech_stack', '')} {plan.get('market_analysis', '')}"
        similar_projects = rag_service.search(query, top_k=3, threshold=0.6)

        # Build context
        context = ""
        if similar_projects:
            context = "\n\n参考往届相似项目：\n"
            for i, proj in enumerate(similar_projects):
                context += f"{i+1}. {proj['content'][:300]}... (相似度: {proj['similarity']:.0%})\n"

        # Build user message
        user_message = f"""请评估以下预计划：

项目名称：{plan.get('title', 'N/A')}
技术栈：{plan.get('tech_stack', 'N/A')}
目标受众：{plan.get('target_audience', 'N/A')}
市场分析：{plan.get('market_analysis', 'N/A')}
创新点：{plan.get('innovation', 'N/A')}
预期成果：{plan.get('expected_outcome', 'N/A')}
时间规划：{plan.get('timeline', 'N/A')}
{context}

请按照系统提示的JSON格式输出评估结果。"""

        # Get AI review
        response = llm_service.chat(PRE_PLAN_REVIEW_SYSTEM, user_message, temperature=0.3)

        # Parse JSON response
        try:
            # Extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            result = json.loads(response[json_start:json_end])
        except json.JSONDecodeError:
            result = {
                "score": 50,
                "breakdown": {
                    "feasibility": 50,
                    "innovation": 50,
                    "completeness": 50,
                    "market_fit": 50
                },
                "summary": response[:200],
                "suggestions": []
            }

        # Add similar projects reference
        result["similar_projects"] = [
            {
                "title": proj["metadata"].get("title", "Unknown"),
                "similarity": round(proj["similarity"] * 100),
                "year": proj["metadata"].get("year", "Unknown")
            }
            for proj in similar_projects
        ]

        return result

    def match_execution(self, pre_plan: dict, execution: dict) -> dict:
        """Compare pre-plan with execution plan and return match analysis."""
        user_message = f"""请对比以下预计划和执行情况：

【预计划】
项目名称：{pre_plan.get('title', 'N/A')}
技术栈：{pre_plan.get('tech_stack', 'N/A')}
预期成果：{pre_plan.get('expected_outcome', 'N/A')}
时间规划：{pre_plan.get('timeline', 'N/A')}

【实际执行】
实际技术栈：{execution.get('actual_tech', 'N/A')}
实际进度：{execution.get('actual_progress', 'N/A')}
偏差说明：{execution.get('deviations', 'N/A')}

请按照系统提示的JSON格式输出对比分析结果。"""

        response = llm_service.chat(EXECUTION_MATCH_SYSTEM, user_message, temperature=0.3)

        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            result = json.loads(response[json_start:json_end])
        except json.JSONDecodeError:
            result = {
                "score": 50,
                "breakdown": {
                    "tech_match": 50,
                    "progress_match": 50,
                    "deliverable_match": 50
                },
                "summary": response[:200],
                "deviations": [],
                "suggestions": []
            }

        return result


review_service = ReviewService()
```

- [ ] **Step 3: Commit**

```bash
git add ai-service/app/services/review_service.py ai-service/app/utils/prompts.py
git commit -m "feat: add AI review service for pre-plans and execution plans"
```

---

## Task 6: AI Tools Service

**Files:**
- Create: `ai-service/app/services/tool_service.py`

- [ ] **Step 1: Create tool_service.py**

```python
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service


class ToolService:
    """6 AI-powered tools for competition management."""

    def business_plan(self, project_info: str) -> str:
        """Generate a business plan framework."""
        # Search for similar past projects
        similar = rag_service.search(project_info, top_k=3)

        context = ""
        if similar:
            context = "\n\n参考往届优秀商业计划书：\n"
            for proj in similar:
                context += f"- {proj['content'][:200]}...\n"

        system_prompt = """你是一个专业的商业计划书撰写专家。
请根据用户提供的项目信息，生成一份结构化的商业计划书框架。

商业计划书应包含：
1. 执行摘要
2. 市场机会
3. 产品方案
4. 商业模式
5. 竞争优势
6. 团队介绍
7. 财务预测

请使用Markdown格式输出，包含标题、列表和表格。"""

        user_message = f"请为以下项目生成商业计划书框架：\n\n{project_info}\n{context}"

        return llm_service.chat(system_prompt, user_message)

    def market_analysis(self, industry: str, target_market: str) -> str:
        """Generate market analysis report."""
        similar = rag_service.search(f"{industry} {target_market}", top_k=3)

        context = ""
        if similar:
            context = "\n\n参考相关市场数据：\n"
            for doc in similar:
                context += f"- {doc['content'][:200]}...\n"

        system_prompt = """你是一个专业的市场分析师。
请根据用户提供的行业和目标市场信息，生成一份市场分析报告。

报告应包含：
1. 市场规模与增长趋势
2. 目标市场细分
3. 主要竞品分析
4. 目标用户画像
5. 差异化机会

请使用Markdown格式输出，包含数据表格。"""

        user_message = f"行业：{industry}\n目标市场：{target_market}\n{context}"

        return llm_service.chat(system_prompt, user_message)

    def improvement_suggestions(self, project_description: str) -> str:
        """Generate improvement suggestions based on past winning projects."""
        similar = rag_service.search(project_description, top_k=5, threshold=0.6)

        context = ""
        if similar:
            context = "\n\n往届获奖项目参考：\n"
            for i, proj in enumerate(similar):
                context += f"{i+1}. {proj['content'][:300]}... (相似度: {proj['similarity']:.0%})\n"

        system_prompt = """你是一个专业的竞赛项目顾问。
请根据往届获奖项目经验，为当前项目提供改进建议。

请按优先级输出建议：
1. 高优先级改进（必须做）
2. 中优先级改进（建议做）
3. 低优先级改进（可选）

每条建议请说明具体原因和参考案例。"""

        user_message = f"当前项目描述：\n{project_description}\n{context}"

        return llm_service.chat(system_prompt, user_message)

    def tech_route(self, requirements: str, team_skills: str) -> str:
        """Recommend technical route and architecture."""
        system_prompt = """你是一个资深的技术架构师。
请根据项目需求和团队技能，推荐技术栈和系统架构方案。

请包含：
1. 推荐技术栈（前端、后端、数据库、AI框架）
2. 系统架构方案
3. 为什么选择这套方案
4. 开发计划建议
5. 风险提示

请使用Markdown格式输出。"""

        user_message = f"项目需求：\n{requirements}\n\n团队技能：\n{team_skills}"

        return llm_service.chat(system_prompt, user_message)

    def resource_integration(self, team_info: str, project_needs: str) -> str:
        """Recommend cross-discipline resource integration."""
        system_prompt = """你是一个跨学科资源整合专家。
请分析团队技能缺口，推荐跨学科协作资源。

请包含：
1. 当前技能画像（强项和缺口）
2. 资源补充建议（人员、知识、工具）
3. 快速学习路线
4. 团队分工优化建议

请使用Markdown格式输出。"""

        user_message = f"团队信息：\n{team_info}\n\n项目需求：\n{project_needs}"

        return llm_service.chat(system_prompt, user_message)

    def competition_advisor(self, project_status: str, time_remaining: str) -> str:
        """Provide competition strategy advice."""
        system_prompt = """你是一个经验丰富的竞赛顾问。
请根据项目状态和剩余时间，给出冲刺策略建议。

请包含：
1. 当前状态评估
2. 优先级排序（必须做 vs 可以放弃）
3. 时间分配建议
4. 答辩准备建议
5. 风险备份方案

请使用Markdown格式输出，语气要鼓励但务实。"""

        user_message = f"项目状态：\n{project_status}\n\n剩余时间：{time_remaining}"

        return llm_service.chat(system_prompt, user_message)


tool_service = ToolService()
```

- [ ] **Step 2: Commit**

```bash
git add ai-service/app/services/tool_service.py
git commit -m "feat: add 6 AI tools service"
```

---

## Task 7: API Routers

**Files:**
- Create: `ai-service/app/routers/health.py`
- Create: `ai-service/app/routers/rag.py`
- Create: `ai-service/app/routers/review.py`
- Create: `ai-service/app/routers/tools.py`
- Create: `ai-service/app/models/schemas.py`

- [ ] **Step 1: Create schemas.py**

```python
from pydantic import BaseModel
from typing import Optional


class RAGQuery(BaseModel):
    question: str
    top_k: int = 5


class RAGIngest(BaseModel):
    content: str
    metadata: dict = {}


class RAGIngestBatch(BaseModel):
    documents: list[RAGIngest]


class PrePlanReview(BaseModel):
    title: str
    tech_stack: str
    target_audience: str
    market_analysis: str
    innovation: str
    expected_outcome: str
    timeline: str


class ExecutionMatch(BaseModel):
    pre_plan: PrePlanReview
    actual_tech: str
    actual_progress: str
    deviations: str


class ToolRequest(BaseModel):
    input: str
    extra: Optional[str] = None
```

- [ ] **Step 2: Create health.py**

```python
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service"}
```

- [ ] **Step 3: Create rag.py**

```python
from fastapi import APIRouter
from app.models.schemas import RAGQuery, RAGIngest, RAGIngestBatch
from app.services.rag_service import rag_service

router = APIRouter()


@router.post("/query")
async def rag_query(request: RAGQuery):
    result = rag_service.query(request.question, top_k=request.top_k)
    return result


@router.post("/ingest")
async def rag_ingest(request: RAGIngest):
    doc_id = rag_service.ingest(request.content, request.metadata)
    return {"id": doc_id, "message": "Document ingested successfully"}


@router.post("/ingest/batch")
async def rag_ingest_batch(request: RAGIngestBatch):
    docs = [{"content": d.content, "metadata": d.metadata} for d in request.documents]
    ids = rag_service.ingest_batch(docs)
    return {"ids": ids, "message": f"Ingested {len(ids)} documents"}


@router.post("/search")
async def rag_search(request: RAGQuery):
    results = rag_service.search(request.question, top_k=request.top_k)
    return {"results": results}
```

- [ ] **Step 4: Create review.py**

```python
from fastapi import APIRouter
from app.models.schemas import PrePlanReview, ExecutionMatch
from app.services.review_service import review_service

router = APIRouter()


@router.post("/pre-plan")
async def review_pre_plan(request: PrePlanReview):
    result = review_service.review_pre_plan(request.dict())
    return result


@router.post("/execution-match")
async def match_execution(request: ExecutionMatch):
    result = review_service.match_execution(
        request.pre_plan.dict(),
        {
            "actual_tech": request.actual_tech,
            "actual_progress": request.actual_progress,
            "deviations": request.deviations
        }
    )
    return result
```

- [ ] **Step 5: Create tools.py**

```python
from fastapi import APIRouter
from app.models.schemas import ToolRequest
from app.services.tool_service import tool_service

router = APIRouter()


@router.post("/business-plan")
async def business_plan(request: ToolRequest):
    result = tool_service.business_plan(request.input)
    return {"result": result}


@router.post("/market-analysis")
async def market_analysis(request: ToolRequest):
    result = tool_service.market_analysis(request.input, request.extra or "")
    return {"result": result}


@router.post("/improvement")
async def improvement_suggestions(request: ToolRequest):
    result = tool_service.improvement_suggestions(request.input)
    return {"result": result}


@router.post("/tech-route")
async def tech_route(request: ToolRequest):
    result = tool_service.tech_route(request.input, request.extra or "")
    return {"result": result}


@router.post("/resource-match")
async def resource_integration(request: ToolRequest):
    result = tool_service.resource_integration(request.input, request.extra or "")
    return {"result": result}


@router.post("/advisor")
async def competition_advisor(request: ToolRequest):
    result = tool_service.competition_advisor(request.input, request.extra or "6 weeks")
    return {"result": result}
```

- [ ] **Step 6: Commit**

```bash
git add ai-service/app/routers/ ai-service/app/models/schemas.py
git commit -m "feat: add API routers for RAG, review, and tools"
```

---

## Task 8: Main Entry Point & Integration

**Files:**
- Create: `ai-service/app/main.py`
- Create: `ai-service/app/services/__init__.py`
- Create: `ai-service/app/routers/__init__.py`
- Create: `ai-service/app/utils/__init__.py`

- [ ] **Step 1: Create main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import init_db
from app.routers import health, rag, review, tools


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    init_db()
    yield


app = FastAPI(
    title="Competition Platform AI Service",
    description="AI-powered service for competition management platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, tags=["health"])
app.include_router(rag.router, prefix="/ai/api/v1/rag", tags=["RAG"])
app.include_router(review.router, prefix="/ai/api/v1/review", tags=["Review"])
app.include_router(tools.router, prefix="/ai/api/v1/tools", tags=["AI Tools"])


@app.get("/")
async def root():
    return {
        "service": "Competition Platform AI Service",
        "version": "1.0.0",
        "docs": "/docs"
    }
```

- [ ] **Step 2: Create __init__.py files**

```python
# ai-service/app/__init__.py
# ai-service/app/services/__init__.py
# ai-service/app/routers/__init__.py
# ai-service/app/utils/__init__.py
# ai-service/app/models/__init__.py
```

- [ ] **Step 3: Commit**

```bash
git add ai-service/app/main.py ai-service/app/*/__init__.py
git commit -m "feat: add FastAPI main entry point"
```

---

## Task 9: Run & Verify

- [ ] **Step 1: Install dependencies**

```bash
cd D:\Code\ssgl\ai-service
pip install -r requirements.txt
```

- [ ] **Step 2: Start the service**

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Expected: Service starts on port 8000.

- [ ] **Step 3: Test health endpoint**

```bash
curl http://localhost:8000/health
```

Expected: `{"status": "healthy", "service": "ai-service"}`

- [ ] **Step 4: Test RAG ingest**

```bash
curl -X POST http://localhost:8000/ai/api/v1/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "2024年获奖项目：智能校园综合服务平台，使用React和Python开发，获得一等奖", "metadata": {"title": "智能校园综合服务平台", "year": 2024}}'
```

Expected: `{"id": 1, "message": "Document ingested successfully"}`

- [ ] **Step 5: Test AI tools**

```bash
curl -X POST http://localhost:8000/ai/api/v1/tools/business-plan \
  -H "Content-Type: application/json" \
  -d '{"input": "AI驱动的智慧校园服务平台，目标市场是国内高校"}'
```

Expected: Returns generated business plan framework.

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete Python AI service"
```

---

## Summary

This plan creates a complete Python AI service with:

1. **RAG Pipeline** — pgvector-based document retrieval with OpenAI embeddings
2. **LLM Integration** — Unified interface for OpenAI and Anthropic APIs
3. **AI Review** — Pre-plan scoring and execution plan matching
4. **6 AI Tools** — Business plan, market analysis, improvement suggestions, tech route, resource integration, competition advisor
5. **REST API** — FastAPI endpoints that the Go backend can proxy to

The Go backend can call `http://localhost:8000/ai/api/v1/*` to access all AI capabilities.
