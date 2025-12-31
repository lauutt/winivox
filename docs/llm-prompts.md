# LLM prompts (OpenAI)

Este doc define los prompts usados por el worker para transcribir y generar metadata.

## Transcripcion (OpenAI Audio)

Prompt base:

\"Transcribi este audio en espanol neutro. Es una historia en audio anonima.
No inventes contenido: solo lo dicho. Mantené la puntuacion y agregá signos
donde ayude a la lectura.\"

## Salida requerida

JSON valido sin texto extra:

{
  "summary": "string",
  "tags": ["string"]
}

## Reglas

- summary: 1-2 frases, <= 220 caracteres, espanol neutro.
- Tono calido y amable, estilo copy web (claro, breve, evocador).
- No incluir nombres propios ni datos identificables.
- Si el transcript tiene PII, reemplazar por terminos genericos.
- tags: 3-6 items, minuscula, 2-4 palabras, sin hashtags, sin PII.
- Tags elocuentes y descriptivos (no genericos).
- Si el transcript es vacio o incomprensible, usar un resumen generico.

## Input

- El transcript se trunca a 4000 caracteres para evitar prompts enormes.
- Modelos OpenAI configurables via `OPENAI_TRANSCRIBE_MODEL` y `OPENAI_METADATA_MODEL`.

## Fallback

- Si la respuesta no es JSON valido, se usa un resumen generico y tags default.
