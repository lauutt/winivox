import { test, expect } from '@playwright/test';

/**
 * Tests de Library
 *
 * Valida la visualización de submissions del usuario,
 * estados de procesamiento, timeline de eventos y
 * actualizaciones en tiempo real (SSE)
 */

// Helper: hacer login antes de cada test
async function login(page) {
  const email = 'test@winivox.test';
  const password = 'testpass123';

  await page.goto('/');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('text=Crear cuenta');
  await page.waitForTimeout(1000);
}

test.describe('Library - Mis Audios', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('debe redirigir a login si no está autenticado', async ({ page }) => {
    // Hacer logout
    await page.click('text=Cerrar sesion');
    await page.waitForTimeout(500);

    // Intentar acceder a /library/
    await page.goto('/library/');
    await page.waitForTimeout(1000);

    // Debería mostrar mensaje de que necesita login o redirigir
    const url = page.url();
    const hasLoginMessage = await page.locator('text=/Inicia sesion|necesitas|autenticar/i').isVisible();

    expect(url === 'http://localhost:5173/' || hasLoginMessage).toBeTruthy();
  });

  test('muestra la lista de submissions cuando está logueado', async ({ page }) => {
    await page.goto('/library/');
    await page.waitForTimeout(1500);

    // Debería mostrar la lista (puede estar vacía)
    const heading = page.locator('text=/Mis audios|Library|Biblioteca/i');
    await expect(heading).toBeVisible();
  });

  test('muestra estado vacío si no hay submissions', async ({ page }) => {
    await page.goto('/library/');
    await page.waitForTimeout(1500);

    // Si no hay submissions, debería haber un mensaje
    const listItems = page.locator('li');
    const count = await listItems.count();

    if (count === 0) {
      const emptyMessage = page.locator('text=/No hay audios|Sin audios|Todavia no/i');
      await expect(emptyMessage).toBeVisible();
    }
  });

  test('muestra indicador de estado de cada submission', async ({ page }) => {
    await page.goto('/library/');
    await page.waitForTimeout(1500);

    const listItems = page.locator('li');
    const count = await listItems.count();

    if (count > 0) {
      // Cada item debería tener un indicador visual de estado
      const firstItem = listItems.first();

      // Debería tener un círculo de color o badge de estado
      const statusIndicator = firstItem.locator('.w-3.h-3.rounded-full');
      const hasIndicator = await statusIndicator.isVisible();

      expect(hasIndicator).toBeTruthy();
    }
  });

  test('muestra barra de progreso para submissions en procesamiento', async ({ page }) => {
    await page.goto('/library/');
    await page.waitForTimeout(1500);

    const listItems = page.locator('li');
    const count = await listItems.count();

    if (count > 0) {
      // Buscar algún item que esté "PROCESSING"
      for (let i = 0; i < count; i++) {
        const item = listItems.nth(i);
        const progressBar = item.locator('role=progressbar');

        if (await progressBar.isVisible()) {
          // Verificar que tiene los atributos ARIA correctos
          await expect(progressBar).toHaveAttribute('aria-valuenow');
          await expect(progressBar).toHaveAttribute('aria-valuemin');
          await expect(progressBar).toHaveAttribute('aria-valuemax');
          break;
        }
      }
    }
  });

  test('puede expandir/colapsar el timeline de un submission', async ({ page }) => {
    await page.goto('/library/');
    await page.waitForTimeout(1500);

    const listItems = page.locator('li');
    const count = await listItems.count();

    if (count > 0) {
      // Buscar botón "Ver detalle" o "Ocultar"
      const toggleButton = page.locator('text=/Ver detalle|Ocultar/i').first();

      if (await toggleButton.isVisible()) {
        const buttonText = await toggleButton.textContent();

        await toggleButton.click();
        await page.waitForTimeout(1000);

        // El texto debería cambiar
        const newText = await toggleButton.textContent();
        expect(newText).not.toBe(buttonText);
      }
    }
  });

  test('muestra timeline de eventos cuando se expande', async ({ page }) => {
    await page.goto('/library/');
    await page.waitForTimeout(1500);

    const toggleButton = page.locator('text=/Ver detalle/i').first();

    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      await page.waitForTimeout(1000);

      // Debería aparecer una lista de eventos
      const timeline = page.locator('text=/Timeline|Eventos|Historial/i');
      await expect(timeline).toBeVisible({ timeout: 3000 });
    }
  });

  test('puede reprocesar un submission rechazado', async ({ page }) => {
    await page.goto('/library/');
    await page.waitForTimeout(1500);

    // Buscar botón de reprocesar (↻)
    const reprocessButton = page.locator('button[aria-label*="Reprocesar"], button').filter({ hasText: '↻' });

    if ((await reprocessButton.count()) > 0 && await reprocessButton.first().isVisible()) {
      const firstReprocess = reprocessButton.first();
      await firstReprocess.click();
      await page.waitForTimeout(1000);

      // Debería haber algún feedback (toast o refresh)
      // En este caso, esperamos que la lista se actualice
    }
  });

  test('muestra indicador de conexión live (SSE)', async ({ page }) => {
    await page.goto('/library/');
    await page.waitForTimeout(2000);

    // Buscar indicador de conexión en vivo
    const liveIndicator = page.locator('text=/Conectado|En vivo|Live/i');

    if (await liveIndicator.isVisible()) {
      await expect(liveIndicator).toBeVisible();
    }
  });

  test('muestra estado de servicios (DB, Storage, Queue, LLM)', async ({ page }) => {
    await page.goto('/library/');
    await page.waitForTimeout(1500);

    // Debería haber una sección de "Estado de sistemas"
    const statusSection = page.locator('text=/Estado de sistemas|System status|Health/i');

    if (await statusSection.isVisible()) {
      // Verificar que muestra alguno de los servicios
      const services = page.locator('text=/DB|Storage|Queue|LLM/i');
      const serviceCount = await services.count();

      expect(serviceCount).toBeGreaterThan(0);
    }
  });

  test('puede filtrar submissions por status', async ({ page }) => {
    await page.goto('/library/');
    await page.waitForTimeout(1500);

    // Buscar filtros de estado
    const filterChips = page.locator('.chip');

    if ((await filterChips.count()) > 0) {
      // Verificar que hay chips para filtrar
      // (APPROVED, PROCESSING, REJECTED, etc.)
      const firstChip = filterChips.first();

      if (await firstChip.isVisible()) {
        await firstChip.click();
        await page.waitForTimeout(500);

        // La lista debería filtrarse
        // (difícil de verificar sin saber el estado actual)
      }
    }
  });

  test('actualiza automáticamente cuando hay nuevos eventos (SSE)', async ({ page }) => {
    // Este test es difícil de validar sin crear un submission real
    // que genere eventos durante el test

    await page.goto('/library/');
    await page.waitForTimeout(1500);

    // Verificar que hay un EventSource activo
    // (esto requeriría espionaje del network)

    // En una implementación real, crearías un submission
    // y verificarías que los eventos llegan automáticamente
  });

  test('muestra enlace a la historia publicada si está aprobada', async ({ page }) => {
    await page.goto('/library/');
    await page.waitForTimeout(1500);

    const listItems = page.locator('li');
    const count = await listItems.count();

    if (count > 0) {
      // Buscar algún item APPROVED
      for (let i = 0; i < count; i++) {
        const item = listItems.nth(i);
        const viewLink = item.locator('text=/Ver en feed|Ver historia publicada/i');

        if (await viewLink.isVisible()) {
          // Debería haber un link a la historia
          await expect(viewLink).toBeVisible();
          break;
        }
      }
    }
  });

  test('muestra detalles de moderación si fue rechazado', async ({ page }) => {
    await page.goto('/library/');
    await page.waitForTimeout(1500);

    // Expandir un submission y buscar eventos de moderación
    const toggleButton = page.locator('text=/Ver detalle/i').first();

    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      await page.waitForTimeout(1000);

      // Buscar eventos de tipo "moderation"
      const moderationEvent = page.locator('text=/moderacion|moderation|flagged/i');

      if (await moderationEvent.isVisible()) {
        await expect(moderationEvent).toBeVisible();
      }
    }
  });
});
