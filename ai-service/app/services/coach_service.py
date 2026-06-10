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
