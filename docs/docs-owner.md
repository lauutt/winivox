# Docs owner

Este archivo explica el estado real del codigo y el MVP hoy.
Es la referencia para decidir que falta y que esta listo.

## Estado actual

- Stack base funcionando con Docker Compose (API, worker, frontend, Postgres, Redis, MinIO).
- Upload directo a MinIO (presigned URL), audio no pasa por FastAPI.
- Pipeline asincrono en worker con anonimizado real, transcripcion OpenAI, moderacion OpenAI y LLM para tags/summary.
- Frontend React 19.2.3 en JS con UI estilo Bandcamp + Twitter viejo.
- Frontend es multi-page: `/` (feed), `/upload/` (subida) y `/library/`.
- Nueva ruta `/library/` para ver estados y timeline de tus audios.
- Feed incluye summary generado por LLM cuando hay `OPENAI_API_KEY`.
- Upload valida token contra `GET /auth/me` y limpia si es invalido.
- Upload soporta `.opus` y grabacion desde microfono.
- Upload permite elegir nivel de anonimizado (OFF/SOFT/MEDIUM/STRONG).
- UI de library hace polling de estados para feedback en tiempo real.
- UI de library muestra preview de transcripcion por submission.
- UI de library permite reprocess y ver timeline de eventos.
- Feed muestra conteo de votos y permite votar.
- Feed permite filtrar por tags y expone un listado via `GET /feed/tags`.
- Reproductor del feed encadena audios relacionados (por tags) sin pausa.
- Reproductor muestra "Up next" y boton Skip para seguir la radio.
- Feed permite ordenar por Latest/Top (basado en votos).
- UI muestra errores de red en upload, eventos y reproduccion.
- Tests base para backend, worker y frontend (smoke).
- Logo en sidebar con formato optimizado (webp + png fallback).
- Transcripts en feed son desplegables para evitar cards gigantes.
- Upload y Library estan desacopladas; procesamiento se sigue en `/library/`.
- Submissions se listan y detallan en `/library/` con updates en vivo.
- Upload devuelve errores mas claros (storage/queue) y UI los muestra.
- Library muestra indicador live y barra animada de procesamiento.
- Library muestra detalles de moderacion en el timeline.
- UI con copy y visual mas analog/comfort (radio).
- Library muestra estado de sistemas (DB/Storage/Queue/LLM).
- Checklist E2E y troubleshooting en `docs/troubleshooting.md`.
- Feed incluye sleep timer para modo radio nocturno.
- Library permite filtrar por status (All/Processing/Approved/Rejected/Quarantined).
- Library usa SSE para updates en tiempo real (fallback a polling).
- MinIO init usa script dedicado `infra/minio-init.sh` con CORS por bucket.
- Script E2E rapido: `scripts/verify-e2e.sh`.

## Servicios

- API (FastAPI): auth, submissions, feed, votos, health.
- Worker: procesamiento asincrono, eventos, publicacion.
- Infra: Postgres, Redis, MinIO.

## Endpoints principales (API)

- `GET /health` (estado + llm/db/storage/queue readiness)
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /submissions` (crea submission + presigned upload)
- `POST /submissions/{id}/uploaded` (marca upload y encola)
- `POST /submissions/{id}/reprocess` (re-encola y reinicia pipeline)
- `GET /submissions`
- `GET /submissions/{id}`
- `GET /feed` (opcional `?tags=tag1,tag2`)
- `GET /feed/tags`
- `POST /votes`
- `GET /events`
- `GET /events/stream` (SSE)

## Pipeline (worker)

Etapas:
- normalize (real)
- transcribe (OpenAI /v1/audio/transcriptions)
- moderate (OpenAI)
- tag (LLM -> tags + summary, fallback mock)
- anonymize_voice (real)
- publish (real)

Estados:
- CREATED -> UPLOADED -> PROCESSING -> APPROVED | REJECTED | QUARANTINED

## Mocks activos

- Tagging + summary (fallback mock si no hay `OPENAI_API_KEY`)

## LLM prompts

- Ver `docs/llm-prompts.md` para reglas del prompt.

## Variables de entorno clave

- `DATABASE_URL`
- `REDIS_URL`
- `MINIO_ENDPOINT`
- `MINIO_PUBLIC_ENDPOINT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_PRIVATE_BUCKET`
- `MINIO_PUBLIC_BUCKET`
- `MINIO_ARTIFACTS_BUCKET`
- `MINIO_API_CORS_ALLOW_ORIGIN`
- `MINIO_CORS_ORIGINS`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_TRANSCRIBE_MODEL`
- `OPENAI_METADATA_MODEL`
- `OPENAI_MODERATION_MODEL`
- `FRONTEND_URL`
- `VITE_DEV_LOGS` (frontend)
- `WORKER_DEV_LOGS` (worker)

## Votos y feedback

- Votos son acumulativos (no hay dedupe por usuario).
- Feed se refresca tras votar.
- Auto-play usa un criterio simple de tags (sin algoritmo complejo).

## Tests

- Backend: `docker compose run --rm api pytest`
- Worker: `docker compose run --rm worker pytest`
- Frontend: `docker compose run --rm frontend npm run test`

## Auth y hashing

- Hashing con Argon2 (passlib), compatible con bcrypt legacy.

## Permisos de red (dev)

- Acceso a web requiere permiso explicito (network access restringido).

## Recordatorio del pedido actual (para no perder rumbo)

- Continuar el desarrollo.
- Documentar siempre lo que se incluye.
- Usar `/docs` para guiarse y actualizar lo que haga falta.
- Mantener `docs/docs-owner.md` actualizado.
