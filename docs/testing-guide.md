# Guía de Testing - Winivox

## Resumen

Esta guía documenta la estrategia de testing del proyecto Winivox, incluyendo tests unitarios con Vitest y tests E2E con Playwright. El objetivo es mantener una cobertura completa de los flujos críticos y garantizar el cumplimiento de accesibilidad WCAG 2.1 AA.

---

## Stack de Testing

- **Vitest 2.1.8** - Framework de testing unitario (compatible con Vite)
- **@testing-library/react 16.1.0** - Utilidades para testing de componentes React
- **@testing-library/jest-dom 6.6.3** - Matchers personalizados para aserciones DOM
- **jsdom 25.0.1** - Implementación DOM para testing en Node.js
- **Playwright 1.57.0** - Framework de testing E2E multi-navegador
- **@axe-core/playwright 4.10.2** - Testing automatizado de accesibilidad WCAG

---

## Tests Unitarios (Vitest)

### Configuración

Los tests unitarios están configurados en `frontend/vitest.config.js` y usan el entorno `jsdom` para simular el navegador.

**Ubicación de tests:**
- `frontend/tests/*.test.jsx` - Tests de componentes y páginas
- `backend/tests/test_*.py` - Tests del backend (pytest)
- `worker/tests/test_*.py` - Tests del worker (pytest)

### Ejecutar Tests Unitarios

```bash
# Frontend
cd frontend
npm run test           # Ejecutar todos los tests
npm run test:watch     # Modo watch para desarrollo
npm run test:ui        # Interfaz visual de Vitest

# Backend
cd backend
pytest                 # Ejecutar todos los tests
pytest -v              # Modo verbose
pytest tests/test_feed.py  # Test específico

# Worker
cd worker
pytest                 # Ejecutar todos los tests
pytest -v              # Modo verbose
```

### Tests Existentes (Frontend)

#### `tests/feed.test.jsx`
- Renderizado del feed con historias
- Filtrado por tags
- Modal de historia (apertura, cierre, Escape key)
- Toasts de votación
- Skeleton loaders durante carga
- Botones de reintentar en errores

#### `tests/upload.test.jsx`
- Redirección cuando no hay autenticación
- Flujo de upload (selección de archivo → configuración)
- Barra de progreso
- Cancelación de upload
- Validación de errores

#### `tests/library.test.jsx`
- Visualización de submissions
- Progress bars para estados PROCESSING
- Timeline de eventos (expandir/colapsar)
- Conexión SSE (simulada)
- Filtros por status

### Escribir Nuevos Tests Unitarios

**Ejemplo de test de componente:**

```jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from '../src/components/MyComponent';

describe('MyComponent', () => {
  it('renderiza correctamente', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('maneja clicks', async () => {
    const { user } = render(<MyComponent onClickBtn={vi.fn()} />);
    await user.click(screen.getByRole('button'));
    expect(onClickBtn).toHaveBeenCalled();
  });
});
```

**Ejemplo de test con hooks:**

```jsx
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '../src/hooks/useMyHook';

it('useMyHook actualiza estado', () => {
  const { result } = renderHook(() => useMyHook());

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
```

---

## Tests E2E (Playwright)

### Configuración

Los tests E2E están configurados en `frontend/playwright.config.js` y se ejecutan contra la aplicación corriendo localmente.

**Características:**
- Múltiples navegadores: Chromium, Firefox, WebKit
- Viewports móviles: Pixel 5, iPhone 12
- Screenshots automáticos en fallos
- Videos de ejecución en fallos
- Traces para debugging
- Reintentos automáticos (2 reintentos)

### Ejecutar Tests E2E

```bash
cd frontend

# Ejecutar todos los tests E2E
npm run test:e2e

# Modo interactivo (UI de Playwright)
npm run test:e2e:ui

# Ver navegador durante ejecución
npm run test:e2e:headed

# Modo debugging (pausa en cada paso)
npm run test:e2e:debug

# Ver reporte HTML de resultados
npm run test:e2e:report

# Ejecutar test específico
npx playwright test e2e/feed.spec.js

# Ejecutar solo en un navegador
npx playwright test --project=chromium
```

### Suite de Tests E2E

#### `e2e/auth.spec.js` (8 tests)
✅ Tests de autenticación:
- Registro de usuario
- Login exitoso
- Login con credenciales inválidas
- Validación de formularios
- Mensajes de error
- Logout
- Persistencia de sesión
- Tokens inválidos

#### `e2e/feed.spec.js` (14 tests)
✅ Tests del feed:
- Carga de historias
- Skeleton loaders durante carga
- Filtrado por tags
- Tags en URL (query params)
- Ordenamiento Latest/Top
- Reproducción de audio
- Player fijo en bottom
- Modal de historia (apertura, cierre, Escape)
- Votación (+1)
- Toasts de confirmación
- Botones de reintentar en errores
- Navegación con historia abierta
- Refresh de feed
- Refresh de tags

#### `e2e/upload.spec.js` (10 tests)
✅ Tests de upload:
- Redirección sin autenticación
- Selección de archivo
- Validación de tipos de archivo (.opus, .mp3)
- Barra de progreso
- Confirmación con configuración (anonymization mode, descripción, tags sugeridos)
- Cancelación y limpieza
- Grabación desde micrófono
- Previsualización de transcripción (simulada)
- Errores de storage/queue
- Navegación a /library/ después de upload

#### `e2e/library.spec.js` (12 tests)
✅ Tests de library:
- Validación de autenticación
- Visualización de submissions
- Indicadores de estado (círculos de color)
- Progress bars para PROCESSING (con ARIA)
- Timeline de eventos (expandir/colapsar)
- Conexión SSE live
- Estado de sistemas (DB, Storage, Queue, LLM)
- Filtros por status
- Reprocesamiento de submissions rechazados
- Actualización automática (SSE)
- Link a historia publicada (APPROVED)
- Detalles de moderación (REJECTED)

#### `e2e/a11y.spec.js` (20+ tests)
✅ Tests de accesibilidad WCAG 2.1 AA:

**Auditorías automatizadas con axe-core:**
- Feed page sin violaciones
- Upload page sin violaciones
- Library page sin violaciones
- Modal de historia sin violaciones

**Navegación por teclado:**
- Skip link visible al tabular
- Skip link mueve focus a #main-content
- Todos los elementos interactivos accesibles por teclado
- Modal captura focus al abrirse
- Modal se cierra con Escape
- Focus visible en todos los elementos

**ARIA y Semántica:**
- ARIA live regions para contenido dinámico
- Progress bars con aria-valuenow/min/max
- Modales con role="dialog" y aria-modal="true"
- Toasts con role="status" y aria-live="polite"
- Labels asociados a inputs (htmlFor/id)
- Botones con nombres accesibles (aria-label o text content)

**Contraste de Color:**
- Texto con contraste suficiente (≥ 4.5:1)
- Focus visible con contraste adecuado

### Escribir Nuevos Tests E2E

**Estructura básica:**

```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await page.click('button');
    await expect(page.locator('h1')).toContainText('Expected');
  });
});
```

**Test con autenticación (helper function):**

```javascript
async function login(page) {
  await page.goto('/');
  await page.fill('input[type="email"]', 'test@winivox.test');
  await page.fill('input[type="password"]', 'testpass123');
  await page.click('text=Crear cuenta');
  await page.waitForTimeout(1000);
}

test.describe('Authenticated Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('user can access library', async ({ page }) => {
    await page.goto('/library/');
    await expect(page.locator('text=Mis audios')).toBeVisible();
  });
});
```

**Test de accesibilidad con axe-core:**

```javascript
import AxeBuilder from '@axe-core/playwright';

test('page passes WCAG AA', async ({ page }) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
```

**Test con screenshots:**

```javascript
test('visual regression', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('article');

  await expect(page).toHaveScreenshot('feed-page.png', {
    fullPage: true,
    animations: 'disabled',
  });
});
```

---

## Estrategia de Testing

### Pirámide de Testing

1. **Tests Unitarios (Base)** - Mayor cantidad, más rápidos
   - Componentes individuales
   - Hooks personalizados
   - Funciones helper
   - Lógica de negocio

2. **Tests E2E (Cima)** - Menor cantidad, más lentos pero más valiosos
   - Flujos críticos de usuario
   - Integración entre componentes
   - Validación de accesibilidad
   - Validación cross-browser

### Coverage Requerido

**Flujos Críticos (E2E obligatorio):**
- ✅ Autenticación (registro, login, logout)
- ✅ Upload completo (archivo → configuración → confirmación)
- ✅ Feed (carga, filtrado, reproducción, votación)
- ✅ Library (visualización, estados, timeline, SSE)
- ✅ Player (reproducción, skip, sleep timer, playback rate)
- ✅ Accesibilidad WCAG 2.1 AA en todas las páginas

**Componentes Críticos (Unitario):**
- ✅ Toast notifications
- ✅ Skeleton loaders
- ✅ Player component
- ✅ AuthPanel
- ✅ Hooks (useAuth, useFeed, usePlayer, useToast)

### Buenas Prácticas

1. **Tests E2E:**
   - Usar selectores semánticos (`role`, `text`, `label`) en lugar de clases CSS
   - Evitar `waitForTimeout` cuando sea posible, usar `waitForSelector`
   - Validar estados intermedios, no solo el resultado final
   - Incluir mensajes de error descriptivos
   - Limpiar estado entre tests (logout, borrar cookies)

2. **Tests Unitarios:**
   - Tests pequeños y enfocados (una aserción por test cuando sea posible)
   - Mockear dependencias externas (API calls, localStorage)
   - Usar `screen.getByRole` para queries accesibles
   - Validar comportamiento, no implementación

3. **Accesibilidad:**
   - Ejecutar axe-core en todas las páginas principales
   - Validar navegación por teclado manualmente
   - Verificar ARIA attributes en elementos dinámicos
   - Testear con lectores de pantalla (manual) en cambios críticos

---

## CI/CD y Automatización

### GitHub Actions (Recomendado)

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  frontend-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run test

  frontend-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm ci
      - run: npx playwright install --with-deps
      - run: docker-compose up -d
      - run: cd frontend && npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

### Pre-commit Hooks (Recomendado)

```bash
# Instalar husky
npm install --save-dev husky

# Configurar pre-commit hook
npx husky install
npx husky add .husky/pre-commit "cd frontend && npm run test"
```

---

## Debugging Tests

### Playwright Debugging

```bash
# Inspector visual
npx playwright test --debug

# Modo headed (ver navegador)
npx playwright test --headed

# Pausar en test específico
npx playwright test --grep "test name" --debug

# Ver trace de ejecución
npx playwright show-trace trace.zip
```

### Vitest Debugging

```bash
# Modo watch con filtro
npm run test:watch -- MyComponent

# Debugging con Node inspector
node --inspect-brk ./node_modules/.bin/vitest

# Ver coverage
npm run test -- --coverage
```

### Playwright Trace Viewer

Si un test falla, Playwright genera un trace automáticamente. Para verlo:

```bash
npx playwright show-trace frontend/test-results/[test-name]/trace.zip
```

El trace incluye:
- Screenshots de cada paso
- Network requests
- Console logs
- DOM snapshots
- Timing information

---

## Mantenimiento de Tests

### Actualizar Tests Después de Cambios

1. **Cambio de UI:**
   - Actualizar selectores si cambió el HTML
   - Actualizar screenshots de visual regression
   - Validar que tests de accesibilidad sigan pasando

2. **Nuevo Feature:**
   - Agregar test E2E del flujo completo
   - Agregar tests unitarios de componentes nuevos
   - Validar accesibilidad con axe-core

3. **Refactorización:**
   - Los tests NO deberían romperse si solo cambió la implementación
   - Si se rompen, probablemente estén acoplados a implementación (mal diseño)

### Checklist Pre-Deploy

Antes de hacer deploy a producción:

- [ ] `npm run test` pasa en frontend
- [ ] `npm run test:e2e` pasa en frontend
- [ ] `pytest` pasa en backend
- [ ] `pytest` pasa en worker
- [ ] 0 violaciones WCAG 2.1 AA con axe-core
- [ ] Navegación por teclado funciona en flujos críticos
- [ ] Tests pasan en Chromium, Firefox y WebKit
- [ ] Screenshots de visual regression aprobados (si hay cambios visuales)

---

## Recursos Adicionales

- [Playwright Docs](https://playwright.dev/docs/intro)
- [Vitest Docs](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Próximos Pasos

- [ ] Configurar CI/CD en GitHub Actions
- [ ] Agregar tests de performance (Lighthouse CI)
- [ ] Agregar tests de integración backend ↔ worker
- [ ] Configurar visual regression testing automático
- [ ] Agregar tests de carga (k6 o Artillery)
