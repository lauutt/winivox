# Arquitectura — PoC

Arquitectura monolítica desacoplada por colas.

---

## Componentes

### Backend (FastAPI)
- Auth
- Metadata
- Presigned uploads
- Feeds
- Votos

### Worker
- Normalización de audio
- Transcripción (OpenAI)
- Moderación (OpenAI, fallback si falta key)
- Tagging + title + summary + viral_analysis (LLM OpenAI, fallback mock)
- Anonimización de voz (real)
- Publicación

### Infra local
- Postgres
- Redis
- MinIO (S3-compatible)

---

## Storage

Buckets:
- audio-private → audio original
- audio-public → audio publicado
- audio-artifacts → transcripts, tags, metadata

---

## Principio clave

FastAPI **nunca** procesa audio.
