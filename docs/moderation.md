# Moderación — PoC

Moderación real via OpenAI, con fallback simple para no frenar la demo.

---

## Acciones posibles

- APPROVE
- QUARANTINE
- REJECT

---

## Reglas PoC

- Si OpenAI marca `flagged = true` → REJECT.
- Si la llamada falla → QUARANTINE.
- Si no hay `OPENAI_API_KEY` → APPROVE (fallback).
- Si transcript es vacio → APPROVE (fallback).

---

## Nota

- Modelo configurable por `OPENAI_MODERATION_MODEL`.
- El resultado se guarda en `moderation_result` y se emite `audio.moderated`.
