# Eventos del sistema (PoC)

Formato base:
- id
- event_name
- event_version
- submission_id
- timestamp
- payload

---

## Eventos usados

- audio.uploaded
- audio.normalized
- audio.transcribed
- audio.moderated
- audio.tagged (incluye title + summary + tags; viral_analysis se mantiene interno)
- audio.anonymized
- audio.published
- audio.rejected
- audio.quarantined
- audio.reprocess_requested

---

## API (observabilidad)

- `GET /events` (requiere auth, devuelve eventos del usuario)
- `GET /events?submission_id=...` (requiere auth)
- `GET /events/stream?token=...&since=...` (SSE, realtime)

Notas:
- `token` es el access token (query param para EventSource).
- `since` acepta ISO-8601 (ej: `1970-01-01T00:00:00Z`) y sirve para volver a emitir desde un punto.
