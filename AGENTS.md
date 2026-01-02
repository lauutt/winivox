# AGENTS.md — Proof of Concept

Este archivo define cómo deben trabajar agentes de código en este repo.

PRIORIDAD ABSOLUTA:
> Hacer que la demo funcione end-to-end sin complejidad innecesaria.

---

## Reglas generales

- No TypeScript (frontend JS).
- No microservicios.
- No Kubernetes.
- Preparar todo para cargar la API key de OpenAI.
- Todo procesamiento pesado va a workers.
- Audio nunca pasa por FastAPI (solo presigned URLs).

---

## Principios no negociables

- Audio original es PRIVADO.
- Audio público es una copia (posiblemente anonymized).
- Pipeline asíncrono y observable.
- Estados claros y persistidos.

---

## Entregables por cambio

Cada cambio debe incluir:
- Qué hace
- Cómo probarlo local
- Qué queda mockeado
- Siempre correr tests y reportar el resultado (o explicar por qué no).
- Actualizar `docs/agent-status.md` con el estado actual.

---

## Qué NO hacer

- No agregar features sociales (comentarios, DMs).
- No agregar lógica compleja de recomendación.
- No acoplar frontend a detalles internos del pipeline.
