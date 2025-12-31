from openai import OpenAI

from settings import settings

TRANSCRIBE_PROMPT = (
    "Transcribi este audio en espanol neutro. "
    "Es una historia en audio anonima. "
    "No inventes contenido: solo lo dicho. "
    "Mantené la puntuacion y agregá signos donde ayude a la lectura."
)


def transcribe_audio(path: str) -> str:
    if not settings.openai_api_key:
        if settings.dev_logs:
            print("[transcribe] Missing OPENAI_API_KEY, returning empty transcript")
        return ""

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        with open(path, "rb") as audio_file:
            result = client.audio.transcriptions.create(
                model=settings.openai_transcribe_model,
                file=audio_file,
                prompt=TRANSCRIBE_PROMPT,
                response_format="text",
            )
        if isinstance(result, str):
            return result.strip()
        text = getattr(result, "text", "")
        return text.strip()
    except Exception as exc:
        if settings.dev_logs:
            print(f"[transcribe] OpenAI error: {exc}")
        return ""
