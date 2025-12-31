# Troubleshooting (dev)

Checklist rapido para detectar donde se corta el flujo.

## 1) Salud basica

- `GET /health` debe mostrar `db_ready`, `storage_ready`, `queue_ready` en true.
- Si `storage_ready=false`, MinIO no responde desde el API.
- Si `queue_ready=false`, Redis no responde desde el API.

## 2) Upload (cliente)

- Login OK.
- `POST /submissions` debe responder 200 con `upload_url`.
- `PUT upload_url` debe responder 200 (directo a MinIO).
- `POST /submissions/{id}/uploaded` debe responder 200.

Errores tipicos:
- 502 "Storage unavailable": MinIO inaccesible desde API.
- 503 "Queue unavailable": Redis inaccesible desde API.
- 500 en PUT presigned: revisar MinIO y CORS.

## 3) MinIO (CORS)

- `MINIO_CORS_ORIGINS` en `docker-compose.yml` debe incluir `http://localhost:5173`.
- `infra/minio-init.sh` aplica el CORS a los buckets.
- `MINIO_API_CORS_ALLOW_ORIGIN` sigue habilitado para el API de MinIO.
- Si el navegador bloquea el PUT, abrir DevTools y revisar el error de CORS.

## 4) Worker

- Debe consumir la cola y avanzar etapas.
- Revisar logs si queda en PROCESSING.
- Si no hay `OPENAI_API_KEY`, tags/summary usan fallback mock.

## 5) Feed y Library

- `/library/` deberia mostrar items en progreso con barra animada.
- `/` (feed) solo muestra status APPROVED y public_url valido.

## Atajos utiles

- `docker compose logs --tail=200 api`
- `docker compose logs --tail=200 worker`
- `docker compose logs --tail=200 minio`
- `./scripts/verify-e2e.sh /path/to/audio.opus`
