"""AI pitch-coach (模拟答辩) orchestration + in-memory session store."""

import json
import time
import uuid
from dataclasses import dataclass, field

from app.services.ai_tools import ai_tools
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service
from app.utils.json_parse import parse_json
from app.utils.prompts import (
    COACH_FINAL_SYSTEM,
    COACH_OPENING_SYSTEM,
    COACH_TURN_SYSTEM,
)

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


def _merge_consecutive(messages: list[dict]) -> list[dict]:
    """Collapse adjacent same-role messages (Anthropic requires strict alternation)."""
    merged: list[dict] = []
    for m in messages:
        if merged and merged[-1]["role"] == m["role"]:
            merged[-1] = {"role": m["role"],
                          "content": merged[-1]["content"] + "\n\n" + m["content"]}
        else:
            merged.append(dict(m))
    return merged


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
    return _merge_consecutive(messages)


def extract_followup(reaction_text: str) -> str | None:
    """Return the follow-up question if the reaction ends with a 「追问：」line."""
    for line in reversed(reaction_text.splitlines()):
        stripped = line.strip()
        if stripped.startswith("追问："):
            q = stripped[len("追问："):].strip()
            return q or None
    return None


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
