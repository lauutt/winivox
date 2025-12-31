# PoC Scope

## Objetivo principal
Validar el concepto de:
- audio anónimo
- procesamiento automático
- escucha tipo radio

---

## Flujo obligatorio

1. Usuario se registra / loguea
2. Usuario sube un audio
3. Audio entra en procesamiento
4. Worker procesa y publica
5. Audio aparece en feed
6. Usuario escucha y vota

---

## Criterios de éxito

- Upload directo (no bloqueante)
- Procesamiento asíncrono visible
- Pitch shifting audible pero natural
- Audio reproducible sin latencia notable

---

## Mocks permitidos

- Tagging (fallback mock si no hay `OPENAI_API_KEY`)

Todo lo demás debe ser real.
