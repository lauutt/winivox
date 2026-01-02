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
  "title": "string",
  "summary": "string",
  "tags": ["string"],
  "viral_analysis": 0
}

## Reglas

- title: siempre en primera persona, ideal 40-70 caracteres.
- summary: 1-2 frases, <= 220 caracteres, espanol neutro.
- Tono calido y amable, estilo copy web (claro, breve, evocador).
- No incluir nombres propios ni datos identificables.
- Si el transcript tiene PII, reemplazar por terminos genericos.
- tags: 3-6 items, minuscula, 2-4 palabras, sin hashtags, sin PII.
- Tags elocuentes y descriptivos (no genericos).
- viral_analysis: entero 0-100 (0-20 rutinario, 21-60 comun, 61-85 buen potencial, 86-100 alto impacto).
- viral_analysis es interno: no se expone en APIs ni en UI.
- Si el transcript es vacio o incomprensible, usar un resumen generico sin mencionar que el audio esta vacio.
- Si el transcript no tiene contenido, el worker no llama al LLM y devuelve: "La transcripción falló".

## Ejemplos

{
  "title": "Fui a la comisaria y me atendieron mal",
  "summary": "Fui a denunciar algo simple y termine en una espera absurda. Me fui con mas preguntas que respuestas.",
  "tags": ["tramite publico", "mal trato", "desgaste emocional"],
  "viral_analysis": 90
}

{
  "title": "Me quede sin SUBE en hora pico",
  "summary": "Un viaje corto se volvio eterno por una cadena de errores minimos. Termine riendome de la situacion.",
  "tags": ["transporte publico", "micro drama", "humor involuntario"],
  "viral_analysis": 42
}

{
  "title": "Me olvide el cafe de todos los dias",
  "summary": "Un cambio minimo en la rutina me dejo raro todo el dia. Nada grave, solo un detalle.",
  "tags": ["rutina diaria", "sensacion rara", "detalle minimo"],
  "viral_analysis": 12
}

## Input

- El transcript se trunca a 4000 caracteres para evitar prompts enormes.
- Modelos OpenAI configurables via `OPENAI_TRANSCRIBE_MODEL` y `OPENAI_METADATA_MODEL`.

## Fallback

- Si la respuesta no es JSON valido, se usa un resumen generico y tags default.
