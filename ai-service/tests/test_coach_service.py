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
