# Vision MVP (resumen)

Este repo apunta a una demo end-to-end simple: historias en audio anonimas,
con pipeline asincrono, transcripcion+LLM OpenAI para tags/summary, upload fluido y experiencia de escucha tipo radio.

Se prioriza:
- Upload de audio (incluye .opus) y grabacion directa desde microfono.
- Feedback visible del procesamiento asincrono.

Para evitar duplicar info tecnica, ver:
- `docs/docs-owner.md` (estado real del codigo)
- `docs/dev-setup.md` (como levantar local)
- `docs/llm-prompts.md` (prompts de metadata)

Si queres el detalle del MVP y el plan de arranque:
- `docs/mvp-propuesta.md`
- `docs/kickoff.md`

Recordatorio del pedido actual (para no perder rumbo):
- Propuesta de desarrollo para un MVP, basada en estos docs.
- Usar Docker Compose con Hot Reload para dev.
- API de OpenAI lista para configurar la API key.
- React 19.2.3 (frontend JS, sin TS).
- Estilo visual: mezcla Bandcamp + Twitter viejo.
- Dejar archivos de referencia y repetir esta indicacion.
- La idea: cuando digas "arranca", ya exista un puntapie inicial.
