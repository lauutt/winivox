# Eventos del sistema (PoC)

Formato base:
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
- audio.tagged (incluye tags + summary si aplica)
- audio.anonymized
- audio.published
- audio.rejected
- audio.quarantined
- audio.reprocess_requested

---

## API (observabilidad)

- `GET /events` (requiere auth, devuelve eventos del usuario)
- `GET /events?submission_id=...` (requiere auth)
