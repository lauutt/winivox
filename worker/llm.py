import json
from typing import List, Tuple

from openai import OpenAI

from settings import settings

DEFAULT_TAGS = ["historia anonima", "relato personal", "voz en primera persona"]

SUMMARY_PROMPT = (
    "Sos un asistente que genera metadatos para historias en audio anonimas."
    " Devolves SOLO JSON valido, sin texto extra."
    "\nSchema: {\"summary\": string, \"tags\": [string]}"
    "\nReglas summary: 1-2 frases, <= 220 caracteres, espanol neutro,"
    " tono calido y amable, estilo copy web (claro, breve, evocador)."
    " Evita nombres propios o datos identificables. Si hay PII,"
    " reemplaza por terminos genericos."
    "\nReglas tags: 3-6 tags, minuscula, 2-4 palabras, sin hashtags,"
    " sin PII, sin repetidos. Deben ser elocuentes y descriptivos"
    " (ej: \"ruptura y duelo\", \"turno de madrugada\")."
    "\nSi el transcript esta vacio o incomprensible, usa un resumen generico."
)


def _fallback(transcript: str) -> Tuple[str, List[str], bool]:
    snippet = transcript.strip()[:200]
    summary = snippet if snippet else "historia anonima en audio"
    return summary, DEFAULT_TAGS, False


def _extract_json(text: str) -> dict | None:
    if not text:
        return None
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None


def _truncate_transcript(transcript: str, limit: int = 4000) -> str:
    if len(transcript) <= limit:
        return transcript
    return transcript[:limit]


def _clean_tags(tags: list) -> List[str]:
    cleaned = []
    for tag in tags:
        value = str(tag).strip().lower().lstrip("#")
        if not value:
            continue
        if value not in cleaned:
            cleaned.append(value)
        if len(cleaned) >= 6:
            break
    if len(cleaned) < 3:
        cleaned = DEFAULT_TAGS
    return cleaned


def generate_metadata(transcript: str) -> Tuple[str, List[str], bool]:
    if not settings.openai_api_key:
        if settings.dev_logs:
            print("[llm] Missing OPENAI_API_KEY, using fallback")
        return _fallback(transcript)

    prompt = f"Transcript: {_truncate_transcript(transcript)}"

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model=settings.openai_metadata_model,
            messages=[
                {"role": "system", "content": SUMMARY_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content or ""
        data = _extract_json(content)
        if not data:
            if settings.dev_logs:
                print("[llm] LLM response not JSON, using fallback")
            return _fallback(transcript)

        summary = str(data.get("summary") or "").strip() or "historia anonima"
        summary = summary[:220]
        tags = _clean_tags(data.get("tags") or DEFAULT_TAGS)
        return summary, tags, True
    except Exception as exc:
        if settings.dev_logs:
            print(f"[llm] OpenAI error: {exc}")
        return _fallback(transcript)
