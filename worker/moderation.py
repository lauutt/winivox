from typing import Any, Dict, Tuple

from openai import OpenAI

from settings import settings

MAX_CHARS = 4000


def _to_dict(value: Any) -> Dict[str, Any]:
    if value is None:
        return {}
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if isinstance(value, dict):
        return value
    return {}


def moderate_text(transcript: str) -> Tuple[str, Dict[str, Any]]:
    text = (transcript or "").strip()

    if not settings.openai_api_key:
        if settings.dev_logs:
            print("[moderation] Missing OPENAI_API_KEY, approving by default")
        return "APPROVE", {"reason": "missing_api_key"}

    if not text:
        if settings.dev_logs:
            print("[moderation] Empty transcript, approving by default")
        return "APPROVE", {"reason": "empty_transcript"}

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.moderations.create(
            model=settings.openai_moderation_model,
            input=text[:MAX_CHARS],
        )
        result = response.results[0] if response.results else None
        if not result:
            return "QUARANTINE", {"reason": "empty_result"}
        flagged = bool(getattr(result, "flagged", False))
        categories = _to_dict(getattr(result, "categories", None))
        scores = _to_dict(getattr(result, "category_scores", None))
        decision = "REJECT" if flagged else "APPROVE"
        return decision, {
            "flagged": flagged,
            "categories": categories,
            "scores": scores,
            "model": settings.openai_moderation_model,
        }
    except Exception as exc:
        if settings.dev_logs:
            print(f"[moderation] OpenAI error: {exc}")
        return "QUARANTINE", {"reason": "moderation_error"}
