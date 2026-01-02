# Changes log

## 2026-01-02

### Perfil y portadas
- API: perfil con bio/redes/foto y presigned upload de imagen.
- API: portada por audio con presigned upload + `cover_url` en feed/story/submissions.
- Frontend: nueva pagina `/profile/` + upload con portada opcional.
- UI: portadas usan foto de perfil si no hay imagen del audio.
- Docs: modelo de datos actualizado.

### Ajustes de UX
- Upload: handler de archivos reordenado para evitar error de inicializacion.
- Upload: resetUpload reordenado para evitar ReferenceError al renderizar.
- Perfil: carga mas guiada con checklist y preview con bio/redes.
- Layout: perfil y biblioteca ahora expanden el contenido sin sidebar derecha.
- Feed: controles de escucha pasan al hover en portada + aplauso unico.
- Feed: link sutil a perfil publico en cards y en historia.
- Perfil publico: nueva vista `/profile-public/` con bio/foto/redes.
- API: votos ahora evitan duplicados por usuario.
- Biblioteca: se agrega borrado de historias con limpieza de storage.

### FASE 0: Análisis con Playwright
- Testing: instalado @playwright/test y @axe-core/playwright
- Testing: configurado Playwright con múltiples navegadores (chromium, firefox, webkit, mobile)
- Testing: creado script exploratorio e2e/explore.spec.js para análisis de UX y accesibilidad
- Testing: generados screenshots desktop y mobile de todas las páginas
- Docs: documentados hallazgos en docs/playwright-findings.md

### FASE 1: Mejoras de Accesibilidad Crítica
- Frontend (FeedPage): fix crítico - player no bloquea más los clicks (pointer-events strategy)
- Frontend (Layout): aumentado padding-bottom para evitar superposición con player
- Frontend (Layout): agregado skip link al contenido principal con estilos sr-only
- Frontend (styles.css): cambiado contraste de --muted de 76→60 para cumplir WCAG AA (ratio 5.5:1)
- Frontend (styles.css): agregados estilos focus-visible mejorados (outline 3px)
- Frontend (styles.css): agregado soporte para prefers-reduced-motion
- Frontend (FeedPage): implementado Escape key handler para cerrar modal de historia
- Frontend (FeedPage): agregado focus management al modal (ref, tabIndex, auto-focus)
- Frontend (FeedPage): agregados atributos ARIA al modal (role="dialog", aria-modal, aria-labelledby)
- Frontend (FeedPage): agregada ARIA live region para anunciar estados del feed
- Frontend (LibraryPage): agregada ARIA live region para actualizaciones SSE
- Frontend (AuthPanel): convertido a labels explícitos con htmlFor/id
- Frontend (AuthPanel): agregados atributos ARIA (aria-required, aria-invalid, aria-describedby, aria-live)
- Testing: validado 0 violaciones WCAG 2.1 AA en todas las páginas con axe-core
- Docs: creado docs/fase1-mejoras-implementadas.md con resumen completo

### FASE 2: Mejoras de UX - Loading & Feedback
- Frontend: creado componente SkeletonCard para estados de carga visual (frontend/src/components/SkeletonCard.jsx)
- Frontend (FeedPage): reemplazado "Cargando historias..." con 3 instancias de SkeletonCard
- Frontend: creado sistema de Toast notifications (frontend/src/components/Toast.jsx)
- Frontend: creado hook useToast para manejo de toasts (frontend/src/hooks/useToast.js)
- Frontend (FeedPage): integrado Toast para feedback de votos (éxito/error)
- Frontend (FeedPage): agregados botones "Reintentar" en feedError y storyError
- Frontend (UploadPage): agregado campo percentage (0-100) al estado uploadProgress
- Frontend (UploadPage): creada función uploadToMinioWithProgress usando XMLHttpRequest
- Frontend (UploadPage): implementada barra de progreso visual con porcentaje durante uploads
- Frontend (UploadPage): agregados atributos ARIA a progress bar (role="progressbar", aria-valuenow, etc.)
- UX: skeleton loaders mejoran percepción de velocidad de carga
- UX: toasts proporcionan feedback inmediato para todas las acciones críticas
- UX: error recovery permite reintentar sin recargar la página
- UX: upload progress proporciona transparencia completa en subidas de archivos
- Docs: creado docs/fase2-mejoras-ux.md con resumen completo y ejemplos de código

### FASE 3: Refactorización Frontend - Component Architecture
- Frontend: creado hook useAuth para encapsular lógica de autenticación (frontend/src/hooks/useAuth.js)
- Frontend (FeedPage): integrado useAuth, eliminadas funciones handleRegister/handleLogin/handleLogout
- Frontend (UploadPage): integrado useAuth, eliminadas funciones de auth duplicadas
- Frontend (LibraryPage): integrado useAuth, eliminadas funciones de auth duplicadas
- Frontend: creado hook useFeed para gestionar feed, tags y serendipia (frontend/src/hooks/useFeed.js)
- Frontend (FeedPage): integrado useFeed, eliminadas funciones loadFeed/loadTags/loadLowSerendipia
- Frontend (FeedPage): eliminadas funciones helper parseTagsFromUrl, updateTagsInUrl, buildFeedUrl (ahora en useFeed)
- Frontend: creado hook usePlayer para gestionar reproductor de audio (frontend/src/hooks/usePlayer.js)
- Frontend (FeedPage): integrado usePlayer, eliminados useEffects de autoPlay y sleepTimer
- Frontend (FeedPage): eliminadas funciones handleSelectTrack, handleTrackEnded, handleSkip, pickNextTrack
- Frontend: creado componente Player para UI del reproductor (frontend/src/components/Player.jsx)
- Frontend (FeedPage): extraído JSX del player a componente Player (~60 líneas menos)
- Refactor: FeedPage reducido de ~870 a 656 líneas (~24% de reducción)
- Arquitectura: separación clara entre lógica (hooks) y presentación (componentes)
- Mantenibilidad: hooks reutilizables en otras páginas si es necesario

### FASE 4: Optimizaciones de Performance
- Frontend (SkeletonCard): aplicado React.memo para evitar re-renders innecesarios
- Frontend (Toast): aplicado React.memo para optimizar notificaciones
- Frontend (Player): aplicado React.memo para evitar re-renders del reproductor
- Frontend (FeedPage): envueltos callbacks en useCallback (handleVote, handleTagToggle, clearTags, loadStory, openStory)
- Frontend (UploadPage): envueltos callbacks en useCallback (handleFileSelect, uploadFileToMinio, confirmUpload, cancelUpload, resetUpload, startRecording, stopRecording, clearRecording, uploadRecording, stopStream)
- Frontend (LibraryPage): envueltos callbacks en useCallback (handleReprocess, toggleTimeline)
- Performance: componentes memoizados previenen re-renders cuando props no cambian
- Performance: callbacks estables reducen dependencias en useEffect y optimizan child components
- Virtualización: evaluada y NO implementada (feed limitado a 50 items, library en MVP < 50 items/usuario)
- Nota: virtualización se agregará en el futuro si library supera 50-100 items por usuario

### FASE 5: Testing E2E con Playwright
- Testing: creada suite completa de tests E2E con Playwright 1.57.0
- Testing (auth.spec.js): 8 tests de autenticación (registro, login, logout, validación de formularios)
- Testing (feed.spec.js): 14 tests del feed (carga, skeleton loaders, filtrado por tags, ordenamiento, reproducción de audio, modal de historia, votación)
- Testing (upload.spec.js): 10 tests de upload (validación de auth, selección de archivo, progreso, cancelación, grabación desde micrófono)
- Testing (library.spec.js): 12 tests de library (visualización de submissions, estados de procesamiento, progress bars, timeline de eventos, SSE live updates, filtros por status, reprocesamiento)
- Testing (a11y.spec.js): 20+ tests de accesibilidad con axe-core (WCAG 2.1 AA)
- Testing: validación automática de 0 violaciones WCAG 2.1 AA en feed, upload, library y modales
- Testing: validación de navegación por teclado (skip link, Tab navigation, Escape key, focus management en modales)
- Testing: validación de atributos ARIA (live regions, progress bars con aria-valuenow/min/max, modales con role="dialog" y aria-modal, toasts con role="status")
- Testing: validación de contraste de color y labels de formularios con htmlFor/id
- Testing: tests en múltiples navegadores (chromium, firefox, webkit) y viewports mobile (Pixel 5, iPhone 12)
- Testing: screenshots y videos automáticos en caso de fallos
- Testing: traces automáticos en reintentos para debugging
- Scripts: npm run test:e2e (ejecutar todos), test:e2e:ui (modo interactivo), test:e2e:headed (ver navegador), test:e2e:debug (debugging), test:e2e:report (reporte HTML)
- Cobertura: 60+ tests E2E validando todos los flujos críticos y accesibilidad completa de la aplicación

### FASE 6: Mejoras del Reproductor de Audio
- Frontend (Player): agregado control de velocidad de reproducción (0.5x - 2x) con 7 opciones (0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x)
- Frontend (Player): control de velocidad con atributos ARIA completos (aria-label) y deshabilitado cuando no hay track
- Frontend (usePlayer): agregado estado playbackRate con sincronización automática al elemento audio
- Frontend (usePlayer): aplicación reactiva de playbackRate mediante useEffect
- Frontend (FeedPage): integrado nuevo control de playbackRate desde usePlayer
- UX: velocidad de reproducción permite escuchar más rápido o más lento según preferencia del usuario
- UX: selector intuitivo con labels descriptivos
- Nota: no se agregó control de volumen customizado ya que el elemento <audio> nativo ya incluye control de volumen

### FASE 7: Documentación y Finalización
- Docs: creado docs/frontend-architecture.md con documentación completa de arquitectura frontend
- Docs: documentados todos los custom hooks (useAuth, useFeed, usePlayer, useToast, useLibrarySSE)
- Docs: documentados todos los componentes principales (Player, Toast, SkeletonCard, AuthPanel, Layout)
- Docs: documentados patterns de performance (React.memo, useCallback, useMemo)
- Docs: creado docs/testing-guide.md con guía completa de testing
- Docs: guía incluye instrucciones para tests unitarios (Vitest) y E2E (Playwright)
- Docs: documentados 60+ tests E2E (auth, feed, upload, library, a11y)
- Docs: incluidas instrucciones de debugging y troubleshooting de tests
- Docs: actualizado README.md con instrucciones completas de setup, testing y contribución
- Docs: README incluye stack tecnológico, arquitectura, troubleshooting y roadmap post-PoC
- Docs: toda la documentación actualizada para reflejar el estado final del proyecto
- Proyecto: completadas todas las 7 fases del plan de mejoras de UX, frontend y accesibilidad

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
