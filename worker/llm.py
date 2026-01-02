import json
import unicodedata
from typing import List, Tuple

from openai import OpenAI

from settings import settings

DEFAULT_TAGS = ["historia en primera persona", "relato personal", "vida cotidiana"]
DEFAULT_VIRAL = 50
TRANSCRIPTION_FAILED_LINE = "La transcripción falló"

SUMMARY_PROMPT = (
    "Sos un asistente que genera metadatos para historias en audio."
    " Devolves SOLO JSON valido, sin texto extra."
    "\nSchema: {\"title\": string, \"summary\": string, \"tags\": [string], \"viral_analysis\": number}"
    "\nReglas title: siempre en primera persona, ideal 20-50 caracteres, claro y directo."
    "\nReglas summary: 1-2 frases, <= 220 caracteres, espanol neutro,"
    " tono calido y amable, estilo copy web (claro, breve, evocador)."
    " Evita nombres propios o datos identificables. Si hay PII,"
    " reemplaza por terminos genericos."
    "\nReglas tags: 3-6 tags, minuscula, 2-4 palabras, sin hashtags,"
    " sin PII, sin repetidos. Deben ser elocuentes y descriptivos"
    " (ej: \"ruptura y duelo\", \"turno de madrugada\")."
    "\nReglas viral_analysis: numero entero 0-100. 0-20 = rutinario o sin conflicto."
    " 21-60 = correcto pero comun. 61-85 = buen potencial. 86-100 = alto impacto."
    "\nNo menciones si el audio esta vacio o incomprensible. Usa un resumen generico."
    "\nEjemplos:"
    "\n{\"title\":\"Fui a la comisaria y me atendieron mal\","
    "\"summary\":\"Fui a denunciar algo simple y termine en una espera absurda."
    " Me fui con mas preguntas que respuestas.\","
    "\"tags\":[\"tramite publico\",\"mal trato\",\"desgaste emocional\"],"
    "\"viral_analysis\":90}"
    "\n{\"title\":\"Me quede sin SUBE en hora pico\","
    "\"summary\":\"Un viaje corto se volvio eterno por una cadena de errores minimos."
    " Termine riendome de la situacion.\","
    "\"tags\":[\"transporte publico\",\"micro drama\",\"humor involuntario\"],"
    "\"viral_analysis\":42}"
    "\n{\"title\":\"Me olvide el cafe de todos los dias\","
    "\"summary\":\"Un cambio minimo en la rutina me dejo raro todo el dia."
    " Nada grave, solo un detalle.\","
    "\"tags\":[\"rutina diaria\",\"sensacion rara\",\"detalle minimo\"],"
    "\"viral_analysis\":12}"
    "\nSi el transcript esta vacio o incomprensible, usa un resumen generico."
)


def _fallback(transcript: str, reason: str = "generic") -> Tuple[str, str, List[str], int, bool]:
    if reason == "transcription_failed":
        summary = TRANSCRIPTION_FAILED_LINE
        title = TRANSCRIPTION_FAILED_LINE
        return title, summary, DEFAULT_TAGS, DEFAULT_VIRAL, False

    summary = "Historia en audio de la comunidad."
    title = _normalize_title("")
    return title, summary, DEFAULT_TAGS, DEFAULT_VIRAL, False


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


def _normalize_text(value: str) -> str:
    lowered = value.lower()
    normalized = unicodedata.normalize("NFD", lowered)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def _transcript_has_content(transcript: str) -> bool:
    if not transcript:
        return False
    stripped = transcript.strip()
    if not stripped:
        return False
    normalized = _normalize_text(stripped)
    empty_markers = (
        "audio esta vacio",
        "audio vacio",
        "audio incomprensible",
        "no se entiende",
        "inaudible",
        "incomprensible",
    )
    if any(marker in normalized for marker in empty_markers):
        return False
    letters = sum(1 for ch in normalized if ch.isalpha())
    words = [word for word in normalized.split() if word.isalpha()]
    return letters >= 4 and len(words) >= 1


def _sanitize_summary(summary: str) -> str:
    if not summary:
        return summary
    normalized = _normalize_text(summary)
    if "audio esta vacio" in normalized or "audio vacio" in normalized:
        return "Historia en audio de la comunidad."
    if "incomprensible" in normalized and "audio" in normalized:
        return "Historia en audio de la comunidad."
    if "no se entiende" in normalized and "audio" in normalized:
        return "Historia en audio de la comunidad."
    return summary


def _normalize_title(title: str) -> str:
    base = " ".join(str(title).split()).strip()
    if not base:
        return "Historia en audio de la comunidad"
    return base


def _normalize_viral(value: object) -> int:
    try:
        score = int(float(value))
    except (TypeError, ValueError):
        return DEFAULT_VIRAL
    return max(0, min(100, score))


def generate_metadata(transcript: str) -> Tuple[str, str, List[str], int, bool]:
    if not _transcript_has_content(transcript):
        return _fallback(transcript, "transcription_failed")

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
        if not data or not isinstance(data, dict):
            if settings.dev_logs:
                print("[llm] LLM response not JSON, using fallback")
            return _fallback(transcript)

        title = _normalize_title(data.get("title") or "")
        summary_raw = data.get("summary")
        summary = (
            str(summary_raw).strip()
            if summary_raw is not None
            else "Historia en audio de la comunidad."
        )
        summary = _sanitize_summary(summary)[:220].strip()
        if not summary:
            summary = "Historia en audio de la comunidad."
        raw_tags = data.get("tags")
        if isinstance(raw_tags, str):
            raw_tags = [t.strip() for t in raw_tags.split(",") if t.strip()]
        if not isinstance(raw_tags, list):
            raw_tags = DEFAULT_TAGS
        tags = _clean_tags(raw_tags)
        viral_analysis = _normalize_viral(data.get("viral_analysis"))
        return title, summary, tags, viral_analysis, True
    except Exception as exc:
        if settings.dev_logs:
            print(f"[llm] OpenAI error: {exc}")
        return _fallback(transcript)
