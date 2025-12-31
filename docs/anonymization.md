# Anonimización de voz (Pitch Shifting)

La anonimización de voz es REAL desde el PoC.

---

## Objetivo

Proteger identidad manteniendo naturalidad.

---

## Modos

- OFF → 0 semitonos
- SOFT → ±2
- MEDIUM → ±3
- STRONG → ±4

Por defecto: SOFT.

---

## Reglas

- El audio original nunca se publica.
- La versión publicada puede estar modificada.
- No se puede revertir después de publicar.

---

## Implementación PoC

- ffmpeg + rubberband
- pitch shift sin cambiar tempo
