# Propuesta de desarrollo MVP

Objetivo: validar el concepto de audio anonimo con pipeline asincrono,
experiencia tipo radio y publicacion de copias anonimizadas.

Basado en los docs existentes y en las reglas de `AGENTS.md`.

## Alcance del MVP

- Auth basica (registro/login).
- Upload directo a storage privado con presigned URLs (FastAPI nunca toca audio).
- Upload de archivos .opus y grabacion desde microfono en frontend.
- Pipeline asincrono y observable (worker + eventos).
- Publicacion de copia anonima + feed reproducible.
- Votos simples.
- Estados persistidos y claros.

## Fuera de alcance

- Features sociales.
- Recomendaciones complejas.
- Streaming avanzado.

## Flujo end-to-end

1) Usuario se registra/loguea.
2) Crea una submission, obtiene presigned upload.
3) El cliente sube el audio directo a MinIO (bucket privado).
4) Backend persiste estado `UPLOADED` y encola evento.
5) Worker procesa pipeline y publica copia anonima.
6) Backend expone el audio publico en feed.
7) Usuario escucha y vota.

## Arquitectura propuesta

- FastAPI (monolito):
  - Auth, metadata, presigned URLs, feed, votos, eventos.
  - No procesa audio.
- Worker (proceso pesado):
  - Normalizacion, anonimizado real (ffmpeg + rubberband).
  - Transcripcion y moderacion con OpenAI.
  - Title + summary + viral_analysis con OpenAI (fallback mock si falta key).
- Infra local:
  - Postgres, Redis, MinIO.

## Pipeline (PoC -> MVP)

Etapas:
- audio.uploaded
- normalize
- transcribe (OpenAI)
- moderate (OpenAI)
- tag (LLM OpenAI, fallback mock)
- anonymize_voice (real)
- publish

Reglas:
- Idempotente por etapa.
- Persistir resultado y emitir evento.
- Estados: UPLOADED -> PROCESSING -> APPROVED | REJECTED | QUARANTINED.

## Preparado para OpenAI

- Variables de entorno: `OPENAI_API_KEY`, `OPENAI_TRANSCRIBE_MODEL`, `OPENAI_METADATA_MODEL`.
- Transcripcion real con OpenAI en el worker.
- Title + summary + viral_analysis via LLM OpenAI, fallback mock si falta key.

## Frontend (React 19.2.3, JS)

- Vite + React 19.2.3 (sin TypeScript).
- UI no acoplada a detalles internos del pipeline.
- Estados visibles y explicitos (subiendo, procesando, publicado).
- Ruta dedicada para upload con grabacion directa.

## Direccion visual (Bandcamp + Twitter viejo)

- Layout tipo feed/timeline con cards verticales.
- Sidebar simple con navegacion y filtros basicos.
- Tipografia mixta: serif para titulos, sans para UI.
- Paleta calida (crema/gris suave) + acento azul tenue.
- Player fijo inferior con estilo minimal.

## Docker Compose con Hot Reload (dev)

- `frontend`: Vite dev server, volumen con hot reload.
- `api`: FastAPI con `--reload`.
- `worker`: hot reload si hay cambios en Python.
- `postgres`, `redis`, `minio`.

## Mocks permitidos

- Tagging (fallback mock si falta `OPENAI_API_KEY`).
- Todo lo demas debe ser real (upload, storage, anonimizado, feed).

## Entregables por cambio (recordatorio)

- Que hace.
- Como probarlo local.
- Que queda mockeado.

## Recordatorio del pedido actual (para no perder rumbo)

- Propuesta de desarrollo para un MVP, basada en estos docs.
- Usar Docker Compose con Hot Reload para dev.
- API de OpenAI lista para configurar la API key.
- React 19.2.3 (frontend JS, sin TS).
- Estilo visual: mezcla Bandcamp + Twitter viejo.
- Dejar archivos de referencia y repetir esta indicacion.
- La idea: cuando digas "arranca", ya exista un puntapie inicial.
