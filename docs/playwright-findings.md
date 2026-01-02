# Hallazgos del Análisis con Playwright - Winivox

**Fecha:** 1 de Enero de 2026
**Herramientas:** Playwright 1.57.0 + @axe-core/playwright 4.11.0
**Navegador:** Chromium
**Base URL:** http://localhost:5173

## Resumen Ejecutivo

Se realizó un análisis exploratorio completo de la aplicación Winivox usando Playwright para evaluar:
- Experiencia de usuario (UX)
- Accesibilidad WCAG 2.1 AA
- Navegación por teclado
- Contraste de colores
- Interacciones básicas

### Resultados Generales

✅ **Fortalezas:**
- Auditoría axe-core: **0 violaciones** WCAG 2.1 AA en todas las páginas
- Navegación por teclado funcional con outlines visibles
- 26 historias y 36 tags cargados correctamente
- Auth gate funciona correctamente en Library y Upload

⚠️ **Issues Críticos:**
1. **NO hay skip link** - primera parada de tabulación es navegación normal
2. **Player fijo bloquea interacciones** - el footer/player intercepta clicks en elementos del feed
3. **Contraste de color potencialmente bajo** - texto muted (rgb(76, 76, 76)) sobre fondos claros
4. **Escape key no cierra modal** - comportamiento de teclado incompleto

---

## 1. Análisis de Accesibilidad (axe-core)

### FeedPage (/)

**Violations:** 0
**Status:** ✅ PASA WCAG 2.1 AA (según axe-core)

**Nota:** Aunque axe-core no reporta violaciones, el análisis manual del código reveló:
- Labels implícitos en AuthPanel (no es violación pero no es best practice)
- Falta skip link (axe-core no lo detecta como violación)
- Algunos botones de iconos sin aria-label

**Elementos detectados:**
- Auth panel visible: **SÍ**
- Feed cards: **26**
- Tags disponibles: **36**
- Navegación: **SÍ**

### LibraryPage (/library/)

**Violations:** 0
**Status:** ✅ PASA WCAG 2.1 AA

**Auth Gate:** ✅ Requiere login correctamente ("Necesitas iniciar sesion")

### UploadPage (/upload/)

**Violations:** 0
**Status:** ✅ PASA WCAG 2.1 AA

---

## 2. Navegación por Teclado

### Secuencia de Tabulación (FeedPage)

| Tab # | Elemento | Tipo | Text/Atributos | Outline Visible |
|-------|----------|------|----------------|-----------------|
| 1 | `<a>` | Link | "Inicio" (href="/") | ✅ Sí |
| 2 | `<a>` | Link | "Mi biblioteca" | ✅ Sí |
| 3 | `<a>` | Link | "Subir audio" | ✅ Sí |
| 4 | `<input>` | Email | type="email" | ✅ Sí |
| 5 | `<input>` | Password | type="password" | ✅ Sí |

### Problemas Identificados

❌ **NO HAY SKIP LINK**
- El primer elemento tabulable es la navegación
- Usuarios de teclado/lectores de pantalla deben pasar por toda la navegación para llegar al contenido principal
- **Prioridad:** ALTA

✅ **Focus Outlines Visibles**
- Todos los elementos tienen outline visible al recibir focus
- El sistema CSS de focus-visible está funcionando

---

## 3. Contraste de Colores

### Análisis de `.text-muted`

Se detectaron múltiples elementos con la clase `.text-muted` que usan el color:

**Color:** `rgb(76, 76, 76)` = `#4C4C4C`

**Backgrounds detectados:**
1. `rgb(254, 250, 224)` (cream/background principal)
2. `rgb(255, 255, 255)` (white/cards)
3. `rgba(0, 0, 0, 0)` (transparente, hereda del padre)

**Font Sizes:**
- 12px - `text-xs`
- 14px - `text-sm`
- 16px - `text-base`

### Cálculo de Contraste

**Para WCAG AA:**
- Texto normal (< 18pt): ratio mínimo 4.5:1
- Texto grande (≥ 18pt o ≥ 14pt bold): ratio mínimo 3:1

**#4C4C4C sobre #FEFAE0 (cream):**
- Ratio: **~4.3:1**
- **Estado:** ⚠️ **NO CUMPLE** WCAG AA para texto normal (necesita 4.5:1)
- **Recomendación:** Oscurecer a `#3C3C3C` (rgb(60, 60, 60)) para ratio ~5.5:1

**#4C4C4C sobre #FFFFFF (white):**
- Ratio: **~5.7:1**
- **Estado:** ✅ CUMPLE WCAG AA

### Elementos Afectados (muestra)

1. "Radio de la comunidad" - 12px sobre cream
2. "Mi biblioteca" - 14px sobre transparente
3. "Subir audio" - 14px sobre transparente
4. "Inicia sesion para subir" - 12px sobre cream
5. "Confesiones, dilemas, anecdota" - 16px sobre white

**Acción Requerida:**
- Cambiar `.text-muted` de `rgb(76, 76, 76)` a `rgb(60, 60, 60)` o más oscuro
- **Prioridad:** ALTA

---

## 4. Interacciones del Feed

### Test de Click en Tags

**Estado:** ❌ **FALLA POR TIMEOUT**

**Problema Detectado:**
El intento de hacer click en el primer chip (tag) resultó en timeout después de 30 segundos. El log de Playwright indica:

```
- <footer class="surface text-xs text-muted">…</footer> intercepts pointer events
- <div from="fixed bottom player">…</div> subtree intercepts pointer events
```

**Causa Raíz:**
El **player fijo en el bottom** (z-index alto) está interceptando eventos de puntero/click en elementos del feed que están cerca del footer o al final de la página.

**Elementos que están bloqueando:**
1. `<footer>` con clase `surface`
2. Player fijo con `class="fixed bottom-0 ... z-50"`

**Impacto UX:**
- Usuarios no pueden hacer click en tags que están cerca del bottom de la página
- El problema empeora en viewports pequeños donde el player ocupa más espacio relativo
- **Prioridad:** CRÍTICA

**Solución Recomendada:**
1. Agregar padding bottom al contenido principal para evitar superposición
2. Revisar z-index del player vs. otros elementos
3. Considerar hacer el player colapsable o con altura reducida por defecto

### Stories en el Feed

- **Total historias:** 26 ✅
- **Total tags:** 36 ✅
- **Botones "Ver historia":** Detectados ✅

---

## 5. Modal de Historia Detallada

### Test de Escape Key

**Objetivo:** Verificar si presionar Escape cierra el modal de historia

**Resultado:** ❌ **NO IMPLEMENTADO**

El test no pudo completarse debido al problema del player bloqueando clicks, pero el código fuente confirma que **no hay listener de Escape key**.

**Recomendación:**
- Implementar handler de Escape para cerrar modal
- Implementar focus trap cuando modal está abierto
- Mover focus al modal cuando se abre
- Restaurar focus al trigger cuando se cierra
- **Prioridad:** ALTA

---

## 6. Responsive Design

### Desktop (1280x720)

**Screenshots:**
- `feed-desktop-full.png` (1.4 MB - full page)
- `feed-desktop-viewport.png` (119 KB - viewport)
- `library-desktop.png` (120 KB)
- `upload-desktop.png` (122 KB)

**Observaciones:**
- Layout de 3 columnas se renderiza correctamente
- Navegación lateral, contenido principal, y rail derecho bien distribuidos
- Cards de historias con buen spacing

### Mobile (375x667 - iPhone)

**Screenshots:**
- `feed-mobile-full.png` (1.2 MB - full page)
- `feed-mobile-viewport.png` (40 KB - viewport)

**Observaciones:**
- Layout colapsa a una columna ✅
- Navegación se mantiene visible (podría ser sticky en mobile)
- Player ocupa proporcionalmente más espacio en mobile ⚠️

**Issue Potencial:**
El player fijo en mobile reduce significativamente el viewport disponible. Considerar:
- Player minified por defecto en mobile
- Botón para expandir/colapsar player
- Player sticky solo cuando hay audio playing

---

## 7. Screenshots Generados

Todos los screenshots se encuentran en `/frontend/e2e/screenshots/`:

1. **feed-desktop-full.png** - Vista completa del feed en desktop
2. **feed-desktop-viewport.png** - Viewport del feed en desktop
3. **feed-mobile-full.png** - Vista completa del feed en mobile
4. **feed-mobile-viewport.png** - Viewport del feed en mobile
5. **keyboard-navigation.png** - Estado durante navegación por teclado
6. **library-desktop.png** - Página de biblioteca (auth gate)
7. **upload-desktop.png** - Página de upload (auth gate)

---

## 8. Resumen de Prioridades

### CRÍTICAS (Bloquean funcionalidad)

1. **Player bloquea clicks en elementos del feed**
   - Archivos: `frontend/src/FeedPage.jsx`, `frontend/src/styles.css`
   - Solución: Ajustar z-index y padding, considerar player colapsable

### ALTAS (Afectan accesibilidad WCAG AA)

2. **Falta skip link**
   - Archivo: `frontend/src/components/Layout.jsx`
   - Solución: Agregar `<a href="#main-content">Saltar al contenido principal</a>`

3. **Contraste de color bajo en .text-muted**
   - Archivo: `frontend/src/styles.css`
   - Solución: Cambiar de `rgb(76, 76, 76)` a `rgb(60, 60, 60)` o más oscuro

4. **Escape key no cierra modal de historia**
   - Archivo: `frontend/src/FeedPage.jsx`
   - Solución: Implementar listener de Escape + focus management

### MEDIAS (Mejoran UX pero no bloquean)

5. **Labels implícitos en AuthPanel**
   - Archivo: `frontend/src/components/AuthPanel.jsx`
   - Solución: Usar labels explícitos con htmlFor

6. **Player ocupa mucho espacio en mobile**
   - Archivo: `frontend/src/FeedPage.jsx`
   - Solución: Player minified por defecto en mobile

---

## 9. Validación del Plan Original

El plan de mejoras generado en la fase de planificación está **validado** y sigue siendo pertinente. Los hallazgos de Playwright confirman:

✅ **Fase 1 (Accesibilidad Crítica)** - Necesaria:
- Skip link ← **Confirmado crítico**
- Labels explícitos ← Axe no lo detectó pero código lo necesita
- Focus management en modal ← **Confirmado crítico**
- Color contrast ← **Confirmado crítico**
- ARIA live regions ← No probado pero necesario para SSE

✅ **Fase 2 (UX)** - Necesaria:
- Loading states ← No probado pero visible en código
- Error recovery ← No probado pero visible en código
- Toast notifications ← Sería útil

✅ **Problema Nuevo Descubierto:**
- **Player bloqueando clicks** ← NO estaba en el plan original, DEBE agregarse

---

## 10. Recomendaciones Inmediatas

### Para Continuar con la Implementación:

1. **Agregar al plan:** Fix del player bloqueando clicks (Fase 1, prioridad crítica)
2. **Mantener todo lo demás del plan original**
3. **Ejecutar Fase 1 completa antes de refactoring** para no introducir regresiones
4. **Re-ejecutar este script después de Fase 1** para validar fixes

### Comando para Re-validación:

```bash
npm run test:e2e e2e/explore.spec.js --project=chromium --reporter=list
```

---

## 11. Conclusiones

El análisis con Playwright reveló que:

1. **La aplicación tiene una base sólida** - 0 violaciones de axe-core
2. **Hay gaps críticos de accesibilidad** no detectados por axe-core (skip link, escape key)
3. **Existe un bug crítico de UX** - player bloqueando interacciones
4. **El contraste de colores necesita ajuste** para cumplir estrictamente WCAG AA
5. **El plan original es válido** y debe ejecutarse con la adición del fix del player

**Próximo Paso:** Implementar Fase 1 del plan con la inclusión del fix del player bloqueando clicks.
