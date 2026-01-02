# Agent flow

Objetivo: que cualquier agente entienda el estado actual en menos de 5 minutos.

## Inicio de cada sesion

1) Leer `AGENTS.md` (reglas y prioridades).
2) Leer `docs/agent-status.md` (snapshot actual, single source of truth).
3) Leer `docs/docs-owner.md` para detalle tecnico.
4) Leer `docs/changes-log.md` para contexto historico.
5) Si vas a tocar pipeline o prompts, revisar `docs/pipeline.md` y `docs/llm-prompts.md`.

## Mientras trabajas

- Mantener cambios acotados y observables.
- Actualizar `docs/agent-status.md` con lo que cambia en el estado real.
- Agregar entrada en `docs/changes-log.md` si el cambio es funcional.
- Si cambian flujos o decisiones, actualizar `docs/docs-owner.md`.

## Antes de entregar

- Correr tests y reportar resultado.
- Verificar que `docs/agent-status.md` refleje el estado actual.
- Aclarar que quedo mockeado.

## Template rapido (para agent-status)

- Last update: YYYY-MM-DD
- Current snapshot: 4-8 bullets con estado real
- Known gaps / constraints
- Next focus
- How to verify quickly
- Mocks
