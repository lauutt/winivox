# Audio Stories — Proof of Concept

Prueba de concepto privada de una plataforma de **historias en audio anónimas**, curadas por IA,
con experiencia de consumo tipo “radio”.

Este repo contiene una demo funcional end-to-end:
- login
- upload de audio
- procesamiento asíncrono
- publicación
- reproducción

El foco es **validar concepto y experiencia**, no completar el producto final.

---

## Objetivo del PoC

Demostrar:
1. Que la gente puede subir audios fácilmente.
2. Que el sistema procesa audios sin bloquear al usuario.
3. Que el audio publicado suena bien y es anónimo.
4. Que la experiencia de escucha es simple y continua.

---

## Qué incluye
- Backend FastAPI
- Worker asíncrono (Redis queue)
- Frontend React (JS, sin TypeScript)
- Storage local S3-compatible (MinIO)
- Pitch shifting real para anonimizar voz
- Moderación / tagging / ASR en modo mock

---

## Qué NO incluye (a propósito)
- IA real (Whisper, LLMs)
- Búsqueda avanzada
- Recomendaciones complejas
- Admin UI completa
- HLS / streaming avanzado
- Mobile app

---

## Filosofía del repo

- **Funcionar primero**
- **Escalar después**
- **Nada que no se pueda reemplazar**

Este repo es una base limpia para evolucionar a MVP sin reescribir todo.
# winivox
