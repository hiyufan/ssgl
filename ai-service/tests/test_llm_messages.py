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
