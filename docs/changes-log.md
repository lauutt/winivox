# Changes log

## 2025-12-31

- Agregado `claude.md` con guardrails de documentacion.
- Agregado `docs/docs-owner.md` para estado real del codigo.
- Agregado endpoint `GET /events` para observabilidad.
- Agregado summary y tags por LLM (OpenAI) en worker.
- Agregado campo `summary` en audio_submissions y UI lo muestra en feed.
- Frontend paso a multi-page con ruta `/upload/` para subir audio.
- Upload valida auth con `GET /auth/me` y evita llamadas 401 cuando no hay token.
- Agregado endpoint `GET /auth/me` para validar sesion.
- Fix MinIO init: flags `mc mb` y CORS via `MINIO_API_CORS_ALLOW_ORIGIN`.
- Auth: hashing con Argon2 (passlib) para evitar limite de 72 bytes de bcrypt.
- Nota de permisos: acceso a web requiere permiso explicito.
- Upload: soporte `.opus`, grabacion desde microfono y polling de estados en UI.
- Frontend: logs en dev via `VITE_DEV_LOGS`.
- LLM: prompts refinados y documentados en `docs/llm-prompts.md`.
- Worker: logs de OpenAI controlados por `WORKER_DEV_LOGS`.
- LLM: migrado a OpenAI (transcripcion real + summary/tags) y modelos configurables.
- Health: `gemini_ready` reemplazado por `llm_ready`.
- Transcripcion: OpenAI Audio `/v1/audio/transcriptions` via worker.
- Upload UI: muestra preview de transcripcion para validar flujo.
- Submissions: endpoint `POST /submissions/{id}/reprocess` + timeline en UI.
- Feed: conteo de votos y boton +1.
- Feed: filtro por tags, tags clickeables y endpoint `GET /feed/tags`.
- LLM: resumen mas amable y tags mas descriptivos.
- Feed: reproductor encadena audios relacionados por tags.
- Moderacion: capa real con OpenAI, rechaza audios flagged.
- UX: manejo de errores y estados vacios en upload/feed + docs alineados.
- Tests: base suites para backend, worker y frontend (smoke).
- Feed: fallback de tags para DBs no Postgres (para tests locales).
- UI: logo optimizado (webp + png fallback) y texto menos redundante.
- Feed: transcript preview desplegable para evitar cards muy altas.
