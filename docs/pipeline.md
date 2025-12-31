# Pipeline de procesamiento (PoC)

Pipeline secuencial, asíncrono, idempotente.

---

## Etapas

1. audio.uploaded
2. normalize
3. transcribe (OpenAI)
4. moderate (OpenAI)
5. tag (LLM OpenAI -> tags + summary, fallback mock)
6. anonymize_voice (real)
7. publish

---

## Reglas

- Cada etapa:
  - lee estado
  - ejecuta
  - persiste resultado
  - emite evento

- Si una etapa ya fue ejecutada:
  - no se repite

---

## Estado del audio

UPLOADED → PROCESSING → APPROVED | REJECTED | QUARANTINED
