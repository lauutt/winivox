import logging
import os

from openai import OpenAI

from settings import settings

TRANSCRIBE_PROMPT = (
    "Transcribi este audio en espanol neutro. "
    "Es una historia en audio anonima. "
    "No inventes contenido: solo lo dicho. "
    "Mantené la puntuacion y agregá signos donde ayude a la lectura."
)

logger = logging.getLogger("worker.transcribe")


def transcribe_audio(path: str) -> str:
    if not settings.openai_api_key:
        if settings.dev_logs:
            logger.warning("Missing OPENAI_API_KEY, returning empty transcript")
        return ""

    try:
        try:
            size = os.path.getsize(path)
        except OSError:
            size = 0
        logger.info(
            "Transcribing audio (bytes=%s, model=%s)", size, settings.openai_transcribe_model
        )
        if size == 0:
            logger.warning("Audio file empty or missing, skipping transcription")
            return ""
        if size < 512:
            logger.warning("Audio file very small (%s bytes)", size)
        client = OpenAI(api_key=settings.openai_api_key)
        with open(path, "rb") as audio_file:
            result = client.audio.transcriptions.create(
                model=settings.openai_transcribe_model,
                file=audio_file,
                prompt=TRANSCRIBE_PROMPT,
                response_format="text",
            )
        if isinstance(result, str):
            text = result.strip()
            if not text:
                logger.warning("Transcription returned empty text")
            return text
        text = getattr(result, "text", "")
        text = text.strip()
        if not text:
            logger.warning("Transcription returned empty text")
        return text
    except Exception as exc:
        logger.exception("Transcription failed: %s", exc)
        return ""
