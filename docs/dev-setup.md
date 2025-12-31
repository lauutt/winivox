# Dev setup (docker compose)

This doc is the reference for local dev and build.

## Quick start

1) Copy env: `cp infra/dev.env infra/dev.local.env`
2) Fill `OPENAI_API_KEY` if needed.
3) Run: `docker compose build`
4) Run: `docker compose up`

Services:
- API: http://localhost:8000
- Frontend: http://localhost:5173
- MinIO: http://localhost:9001

Health check:
- `GET /health` devuelve readiness de DB, storage (MinIO) y queue (Redis).

## E2E checklist

Ver `docs/troubleshooting.md` para el flujo completo y errores tipicos.

Frontend routes:
- Feed: http://localhost:5173/
- Upload: http://localhost:5173/upload/
- Library: http://localhost:5173/library/

## Notes

- Audio upload goes direct to MinIO via presigned URLs.
- Worker processes audio and publishes anonymized copies.
- Transcripcion y moderacion real con OpenAI.
- Tagging + summary usan OpenAI cuando `OPENAI_API_KEY` esta seteada.
- Modelos configurables: `OPENAI_TRANSCRIBE_MODEL`, `OPENAI_METADATA_MODEL`,
  `OPENAI_MODERATION_MODEL`.
- `MINIO_PUBLIC_ENDPOINT` should point to `http://localhost:9000` for browser access.
- MinIO CORS is set via `MINIO_API_CORS_ALLOW_ORIGIN` in `docker-compose.yml`.
- Upload soporta `.opus` y grabacion directa desde microfono (pedira permisos).
- Logs dev en frontend: setear `VITE_DEV_LOGS=true` si queres mas detalle.
- Logs dev en worker: setear `WORKER_DEV_LOGS=true`.

## Reminder of current request (keep this here)

- MVP proposal based on docs.
- Docker Compose with hot reload for dev.
- OpenAI API key ready to configure.
- React 19.2.3, frontend JS (no TS).
- Visual style: Bandcamp + old Twitter.
- Leave reference files and repeat this reminder.
- Goal: when you say "arranca", we already have a kickoff.

## Tests

- Backend: `docker compose run --rm api pytest`
- Worker: `docker compose run --rm worker pytest`
- Frontend: `docker compose run --rm frontend npm run test`
