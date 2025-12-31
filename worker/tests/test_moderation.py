from worker.moderation import moderate_text
from worker.settings import Settings


def test_moderation_missing_key(monkeypatch):
    monkeypatch.setattr(
        "worker.moderation.settings",
        Settings(openai_api_key=""),
    )
    decision, details = moderate_text("hola")
    assert decision == "APPROVE"
    assert details["reason"] == "missing_api_key"


def test_moderation_empty_transcript(monkeypatch):
    monkeypatch.setattr(
        "worker.moderation.settings",
        Settings(openai_api_key="test-key"),
    )
    decision, details = moderate_text("")
    assert decision == "APPROVE"
    assert details["reason"] == "empty_transcript"


def test_moderation_error(monkeypatch):
    class BrokenClient:
        def __init__(self, *args, **kwargs):
            raise RuntimeError("boom")

    monkeypatch.setattr(
        "worker.moderation.settings",
        Settings(openai_api_key="test-key"),
    )
    monkeypatch.setattr("worker.moderation.OpenAI", BrokenClient)
    decision, details = moderate_text("hola")
    assert decision == "QUARANTINE"
    assert details["reason"] == "moderation_error"
