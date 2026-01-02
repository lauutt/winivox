# Agent status

Last update: 2026-01-01

Nota: este archivo es la fuente de verdad. Actualizalo en cada cambio real.

## Current snapshot

- E2E demo funciona con Docker Compose (api, worker, frontend, postgres, redis, minio).
- Upload directo a storage privado con presigned URLs; audio nunca pasa por FastAPI.
- Worker ejecuta pipeline asincrono: normalize, transcribe (audio normalizado y comprimido para transcripcion), moderate, title+summary+tags+viral_analysis, anonymize, publish.
- OpenAI integrado para transcripcion, moderacion y title/summary/tags/viral_analysis (fallback si falta `OPENAI_API_KEY`).
- Frontend React (JS) con Tailwind; paginas `/`, `/upload/`, `/library/` y vista de historia `?story=ID`.
- Copy del frontend enfocado en radio de la comunidad y sumado de audios; sin menciones explicitas de anonimizado en UI.
- UI usa title/summary generados por LLM; viral_analysis queda interno y no se expone en APIs (solo `high_potential` y una seccion de baja serendipia). Si el transcript no tiene contenido, se devuelve "La transcripción falló".
- Worker emite logs de transcripcion (inicio, largo, vacio o error) y saltea OpenAI si el audio llega vacio.
- Reproductor sigue sonando al abrir una historia; feed ordena por latest/top.
- Library usa SSE para updates en vivo con fallback a polling y muestra health.
- Feed mueve el filtro de tags a la columna lateral con la guia de temas fusionada.
- Flujo de contexto para agentes: `docs/agent-flow.md`.

## Known gaps / constraints

- Si no hay `OPENAI_API_KEY`, title/summary/viral_analysis usan fallback y la moderacion aplica reglas simples.
- No hay dedupe de votos por usuario (es intencional).
- Fuera de alcance: features sociales, recomendaciones complejas, streaming avanzado.

## Next focus

- Mantener docs alineados cuando se toquen flujos o providers.

## How to verify quickly

- `scripts/verify-e2e.sh`
- `docker compose run --rm api pytest`
- `docker compose run --rm worker pytest`
- `docker compose run --rm frontend npm run test`

## Mocks

- Tagging + title/summary/viral_analysis usa fallback si falta `OPENAI_API_KEY`.
