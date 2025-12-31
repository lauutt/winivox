# Kickoff cuando digas "arranca"

Este archivo es un puntapie inicial para ejecutar el MVP sin perder el rumbo.

## Mapa de repo (propuesto)

- `frontend/` React 19.2.3 (JS) con Vite.
- `backend/` FastAPI (API, auth, presigned URLs, feed, votos).
- `worker/` pipeline asincrono (ffmpeg + rubberband).
- `infra/` Docker Compose, env templates, scripts.
- `docs/` decisiones y guia.

## Docker Compose (dev con hot reload)

Servicios previstos:
- `frontend`: Vite en `5173`, volumen de codigo para HMR.
- `api`: FastAPI en `8000`, `uvicorn --reload`.
- `worker`: proceso que consume Redis queue, hot reload de Python.
- `postgres`, `redis`, `minio`.

Frontend rutas base:
- `/` feed
- `/upload/` subida
- Upload soporta `.opus` y grabacion desde microfono.

Referencia de setup local:
- `docs/dev-setup.md`
- `docs/docs-owner.md`
- `docs/changes-log.md`

Variables de entorno clave:
- `DATABASE_URL`
- `REDIS_URL`
- `MINIO_ENDPOINT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `OPENAI_API_KEY`
- `OPENAI_TRANSCRIBE_MODEL`
- `OPENAI_METADATA_MODEL`

## Primeros pasos cuando digas "arranca"

1) Crear estructura de carpetas y bases (backend/worker/frontend/infra).
2) Docker Compose con hot reload para `api`, `worker`, `frontend`.
3) Backend: auth basica, presigned upload, registro de submissions.
4) Worker: pipeline minimo con normalizacion + anonimizado real.
5) Frontend: login simple, upload con progreso, feed, player.
6) Estados visibles en UI (subiendo, procesando, publicado).

## Criterios de listo del kickoff

- Upload directo a MinIO (audio no pasa por FastAPI).
- Pipeline asincrono visible y persistido.
- Audio publicado con copia anonima.
- Feed reproduce sin latencia notable.

## Recordatorio del pedido actual (para no perder rumbo)

- Propuesta de desarrollo para un MVP, basada en estos docs.
- Usar Docker Compose con Hot Reload para dev.
- API de OpenAI lista para configurar la API key.
- React 19.2.3 (frontend JS, sin TS).
- Estilo visual: mezcla Bandcamp + Twitter viejo.
- Dejar archivos de referencia y repetir esta indicacion.
- La idea: cuando digas "arranca", ya exista un puntapie inicial.
