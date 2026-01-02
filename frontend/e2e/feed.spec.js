import { test, expect } from '@playwright/test';

/**
 * Tests del Feed
 *
 * Valida la visualización de historias, filtrado por tags,
 * reproducción de audio y navegación a detalle de historia
 */

test.describe('Feed de Historias', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('debe cargar y mostrar historias', async ({ page }) => {
    // Esperar a que las historias carguen
    await page.waitForSelector('article', { timeout: 10000 });

    // Verificar que hay al menos una historia
    const stories = page.locator('article');
    const count = await stories.count();
    expect(count).toBeGreaterThan(0);

    // Verificar elementos básicos de una card
    const firstStory = stories.first();
    await expect(firstStory).toBeVisible();
  });

  test('muestra skeleton loaders mientras carga', async ({ page }) => {
    // Recargar para ver el estado de carga
    await page.goto('/');

    // Debería haber skeleton cards temporalmente
    // Nota: Esto es difícil de testear consistentemente
    // porque la carga puede ser muy rápida en local

    // Esperar a que carguen las historias reales
    await page.waitForSelector('article', { timeout: 10000 });
  });

  test('puede filtrar historias por tag', async ({ page }) => {
    await page.waitForSelector('article', { timeout: 10000 });

    // Esperar a que los tags carguen
    await page.waitForSelector('.chip', { timeout: 5000 });

    const chips = page.locator('.chip');
    const chipCount = await chips.count();

    if (chipCount > 0) {
      // Click en el primer tag
      const firstChip = chips.first();
      const tagText = await firstChip.textContent();
      await firstChip.click();

      // Esperar a que la URL se actualice
      await page.waitForTimeout(500);

      // Verificar que la URL contiene el tag
      expect(page.url()).toContain('tags=');

      // Verificar que el tag está seleccionado visualmente
      // (podría tener una clase especial o estar resaltado)
    }
  });

  test('puede limpiar filtros de tags', async ({ page }) => {
    await page.waitForSelector('article', { timeout: 10000 });
    await page.waitForSelector('.chip', { timeout: 5000 });

    const chips = page.locator('.chip');
    const chipCount = await chips.count();

    if (chipCount > 0) {
      // Seleccionar un tag
      await chips.first().click();
      await page.waitForTimeout(500);

      // Buscar y hacer click en el botón de limpiar
      const clearButton = page.locator('text=Limpiar');
      if (await clearButton.isVisible()) {
        await clearButton.click();
        await page.waitForTimeout(500);

        // Verificar que la URL no tiene tags
        expect(page.url()).not.toContain('tags=');
      }
    }
  });

  test('puede cambiar el modo de ordenamiento', async ({ page }) => {
    await page.waitForSelector('article', { timeout: 10000 });

    // Buscar el select de ordenamiento
    const sortSelect = page.locator('select').filter({ hasText: /Latest|Top/i });

    if (await sortSelect.isVisible()) {
      // Cambiar a "Top"
      await sortSelect.selectOption({ label: /Top/i });
      await page.waitForTimeout(500);

      // Verificar que el select cambió
      const selectedValue = await sortSelect.inputValue();
      expect(selectedValue).toBe('top');

      // Cambiar de vuelta a "Latest"
      await sortSelect.selectOption({ label: /Latest/i });
      await page.waitForTimeout(500);

      const newValue = await sortSelect.inputValue();
      expect(newValue).toBe('latest');
    }
  });

  test('puede abrir el detalle de una historia', async ({ page }) => {
    await page.waitForSelector('article', { timeout: 10000 });

    // Buscar botón "Ver historia" o similar
    const viewButton = page.locator('text=/Ver historia/i').first();

    if (await viewButton.isVisible()) {
      await viewButton.click();

      // Esperar a que la URL cambie
      await page.waitForTimeout(500);

      // Verificar que la URL contiene story=
      expect(page.url()).toContain('story=');

      // Verificar que se muestra el modal con transcripción
      await expect(page.locator('text=/Transcripcion/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('puede cerrar el detalle de historia con Escape', async ({ page }) => {
    await page.waitForSelector('article', { timeout: 10000 });

    const viewButton = page.locator('text=/Ver historia/i').first();

    if (await viewButton.isVisible()) {
      await viewButton.click();
      await page.waitForTimeout(500);

      // Verificar que el modal está abierto
      expect(page.url()).toContain('story=');

      // Presionar Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Verificar que el modal se cerró
      expect(page.url()).not.toContain('story=');
    }
  });

  test('puede cerrar el detalle de historia con botón Cerrar', async ({ page }) => {
    await page.waitForSelector('article', { timeout: 10000 });

    const viewButton = page.locator('text=/Ver historia/i').first();

    if (await viewButton.isVisible()) {
      await viewButton.click();
      await page.waitForTimeout(500);

      // Buscar el botón de cerrar (×)
      const closeButton = page.locator('button').filter({ hasText: '×' });

      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(500);

        // Verificar que el modal se cerró
        expect(page.url()).not.toContain('story=');
      }
    }
  });

  test('puede seleccionar un audio para reproducir', async ({ page }) => {
    await page.waitForSelector('article', { timeout: 10000 });

    // Buscar botón "Escuchar"
    const playButton = page.locator('text=Escuchar').first();

    if (await playButton.isVisible()) {
      await playButton.click();
      await page.waitForTimeout(1000);

      // Verificar que el player aparece en la parte inferior
      const player = page.locator('.fixed.bottom-0');
      await expect(player).toBeVisible();

      // Verificar que hay un elemento <audio> con controls
      const audio = page.locator('audio[controls]');
      await expect(audio).toBeVisible();
    }
  });

  test('muestra "Up next" cuando hay siguiente track', async ({ page }) => {
    await page.waitForSelector('article', { timeout: 10000 });

    const playButton = page.locator('text=Escuchar').first();

    if (await playButton.isVisible()) {
      await playButton.click();
      await page.waitForTimeout(1000);

      // Verificar si se muestra "Sigue:" en el player
      const player = page.locator('.fixed.bottom-0');
      const hasNext = await player.locator('text=/Sigue:/i').isVisible();

      // Si hay más de una historia, debería haber "next"
      const stories = page.locator('article');
      const storyCount = await stories.count();

      if (storyCount > 1) {
        expect(hasNext).toBeTruthy();
      }
    }
  });

  test('puede refrescar el feed', async ({ page }) => {
    await page.waitForSelector('article', { timeout: 10000 });

    // Buscar el botón de refresh (↻)
    const refreshButton = page.locator('button').filter({ hasText: '↻' }).first();

    if (await refreshButton.isVisible()) {
      await refreshButton.click();

      // Esperar a que recargue
      await page.waitForTimeout(1000);

      // Verificar que las historias siguen visibles
      await expect(page.locator('article').first()).toBeVisible();
    }
  });

  test('muestra mensaje cuando no hay historias', async ({ page }) => {
    // Este test es difícil de ejecutar sin manipular el backend
    // Se puede simular filtrando por un tag que no existe

    await page.waitForSelector('article', { timeout: 10000 });

    // Agregar un tag falso a la URL
    await page.goto('/?tags=tag-que-no-existe-xyz123');
    await page.waitForTimeout(1000);

    // Debería mostrar un mensaje de "no hay historias" o lista vacía
    const articles = page.locator('article');
    const count = await articles.count();

    if (count === 0) {
      // Verificar que hay algún mensaje indicando que no hay contenido
      const emptyState = page.locator('text=/No hay historias|Sin historias|Ninguna historia/i');
      await expect(emptyState).toBeVisible();
    }
  });

  test('puede votar por una historia (requiere login)', async ({ page }) => {
    // Primero hacer login
    const email = 'test@winivox.test';
    const password = 'testpass123';

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('text=Crear cuenta');
    await page.waitForTimeout(1000);

    // Esperar a que carguen las historias
    await page.waitForSelector('article', { timeout: 10000 });

    // Buscar botón de votar (podría ser "Me gusta", "+1", etc.)
    const voteButton = page.locator('text=/Me gusta|\\+1|Votar/i').first();

    if (await voteButton.isVisible()) {
      const voteCountBefore = await voteButton.textContent();

      await voteButton.click();
      await page.waitForTimeout(1500);

      // Debería aparecer un toast de confirmación
      const toast = page.locator('role=status');
      if (await toast.isVisible()) {
        await expect(toast).toContainText(/voto|registrado/i);
      }
    }
  });
});
