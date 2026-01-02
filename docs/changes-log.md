# Changes log

## 2026-01-01

- Frontend: el filtro de tags vive en el lateral derecho (fusionado con la guia de temas).
- Worker: crea un audio comprimido para transcripcion (m4a) y usa fallback al normalizado si falla.
- Worker: transcripcion vuelve a usar el audio normalizado para evitar error con `.opus`.
- Worker: transcripcion usa el audio original (sin normalizar) para soportar `.opus` directo.
- Upload: refactor a flujo de 2 pasos (selección → configuración)
- Upload: archivo se sube a MinIO ANTES de elegir parámetros
- Backend: POST /submissions ya no requiere anonymization_mode en body
- Backend: POST /submissions/{id}/uploaded ahora recibe configuración completa
- Backend: nuevo endpoint DELETE /submissions/{id} para cancelar upload
- DB: agregados campos description y tags_suggested en audio_submissions
- Frontend: UploadPage con step 1 (upload) y step 2 (configuración)
- Frontend: botón "Cancelar" descarta submission y limpia UI
- Frontend: nuevos campos opcionales: descripción/contexto y tags sugeridos

## 2026-01-01 (anterior)

- Docs: flujo para agentes (`docs/agent-flow.md`) y snapshot de estado (`docs/agent-status.md`).
- Docs: alineado OpenAI en `README.md` y `docs/architecture.md`.
- AGENTS: actualizado provider OpenAI y regla de actualizar `docs/agent-status.md`.
- Script: `scripts/verify-e2e.sh` recuerda actualizar `docs/agent-status.md`.

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
- Library: lista de submissions compacta con detalles bajo demanda.
- Upload: errores de storage/queue se traducen a 502/503 y UI muestra detalle.
- Frontend: nueva ruta `/library/` con updates en vivo y upload desacoplado.
- Library: indicador live + barra animada para progreso del pipeline.
- Library: detalle de moderacion en timeline + estilo de items en proceso.
- UI: copy y tonos visuales mas analog/comfort en feed, upload y library.
- Feed: "Up next" y boton Skip en reproductor.
- API: `/health` ahora reporta readiness de DB/MinIO/Redis.
- Docs: checklist E2E y troubleshooting agregados.
- Feed: orden Latest/Top (basado en votos).
- Library: status de sistemas visible (DB/Storage/Queue/LLM).
- Upload: selector de nivel de anonimizado.
- Library: filtros por status.
- Feed: sleep timer (15/30/45m).
- API: SSE en `/events/stream` para updates en tiempo real.
- Events: payload ahora incluye `id` y `submission_id`.
- Library: streaming realtime con fallback a polling y estado de conexion.
- MinIO: init movido a `infra/minio-init.sh` + `MINIO_CORS_ORIGINS`.
- Script: `scripts/verify-e2e.sh` para validar el flujo end-to-end.
- Frontend: UI simplificada y en espanol para publico general.
- Frontend: textos y labels en espanol + mejoras basicas de accesibilidad.
- Feed: cada audio tiene pagina propia (query `?story=ID`) con transcripcion completa.
- Feed: la transcripcion ya no aparece en cards, solo en la pagina de historia.
- Feed: abrir historia mantiene la radio activa.
- Library: ya no muestra transcripcion; linkea a historia publicada.
- Feed: botones de refresh en icono para etiquetas e historias.
- API: `GET /feed/{id}` devuelve detalle publico + transcripcion.
- API: `GET /feed/tags` soporta `limit` y rota etiquetas.
- Frontend: copy enfocado en radio de la comunidad y subida de audios, sin menciones de anonimizado en UI.
- LLM: title en primera persona + summary + viral_analysis (0-100) con soporte en pipeline y UI (mensaje >85 + seccion de baja serendipia).
- API/UI: viral_analysis ya no se expone; submissions incluyen `high_potential` y feed carga baja serendipia via `GET /feed/low-serendipia`.
- LLM: si la transcripcion no tiene contenido, se usa metadata generica sin mencionar audio vacio.
- Worker: logs claros en transcripcion (inicio, largo, vacio o error) y warning si el transcript queda vacio.
- LLM: si no hay transcript, metadata devuelve la linea "La transcripción falló".
- Worker: se evita llamar a OpenAI cuando el archivo de audio llega vacio y se loguea el tamaño.
