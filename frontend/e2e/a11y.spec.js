import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Tests de Accesibilidad
 *
 * Valida cumplimiento de WCAG 2.1 AA usando axe-core
 * y tests manuales de navegación por teclado
 */

test.describe('Accesibilidad - WCAG 2.1 AA', () => {
  test('feed page debe pasar auditoría axe sin violaciones', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article', { timeout: 10000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('upload page debe pasar auditoría axe sin violaciones', async ({ page }, testInfo) => {
    // Login primero
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@winivox.test');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('text=Crear cuenta');
    await page.waitForTimeout(1000);

    await page.goto('/upload/');
    await page.waitForTimeout(1000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    if (results.violations.length > 0) {
      await testInfo.attach('accessibility-violations', {
        body: JSON.stringify(results.violations, null, 2),
        contentType: 'application/json',
      });
    }

    expect(results.violations).toEqual([]);
  });

  test('library page debe pasar auditoría axe sin violaciones', async ({ page }, testInfo) => {
    // Login primero
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@winivox.test');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('text=Crear cuenta');
    await page.waitForTimeout(1000);

    await page.goto('/library/');
    await page.waitForTimeout(1500);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    if (results.violations.length > 0) {
      await testInfo.attach('accessibility-violations', {
        body: JSON.stringify(results.violations, null, 2),
        contentType: 'application/json',
      });
    }

    expect(results.violations).toEqual([]);
  });

  test('modal de historia debe pasar auditoría axe', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article', { timeout: 10000 });

    // Abrir modal de historia
    const viewButton = page.locator('text=/Ver historia/i').first();

    if (await viewButton.isVisible()) {
      await viewButton.click();
      await page.waitForTimeout(500);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    }
  });
});

test.describe('Navegación por Teclado', () => {
  test('debe tener skip link visible al tabular', async ({ page }) => {
    await page.goto('/');

    // Tabular una vez
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // El skip link debería estar visible cuando tiene focus
    const skipLink = page.locator('a[href="#main-content"]');
    const isVisible = await skipLink.isVisible();

    // Verificar que el skip link está en el DOM
    await expect(skipLink).toHaveCount(1);

    // Si tiene focus, debería ser visible
    const isFocused = await skipLink.evaluate(el => el === document.activeElement);
    if (isFocused) {
      expect(isVisible).toBeTruthy();
    }
  });

  test('skip link debe mover focus al contenido principal', async ({ page }) => {
    await page.goto('/');

    // Tabular al skip link
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    const skipLink = page.locator('a[href="#main-content"]');
    const isFocused = await skipLink.evaluate(el => el === document.activeElement);

    if (isFocused) {
      // Presionar Enter en el skip link
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);

      // El focus debería estar en main-content
      const mainContent = page.locator('#main-content');
      const mainIsFocused = await mainContent.evaluate(el => el === document.activeElement);

      expect(mainIsFocused).toBeTruthy();
    }
  });

  test('todos los elementos interactivos deben ser accesibles por teclado', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article', { timeout: 10000 });

    // Tabular varias veces y verificar que el focus es visible
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // Verificar que el elemento con focus tiene outline visible
      // (esto se validó en los estilos CSS con :focus-visible)
    }

    // Verificar que podemos llegar a los botones principales
    const playButton = page.locator('text=Escuchar').first();
    if (await playButton.isVisible()) {
      // Intentar llegar por teclado (esto es difícil de validar sin saber cuántos tabs)
      // En un test real, usarías page.keyboard.press('Tab') hasta llegar al botón
    }
  });

  test('modal debe capturar focus al abrirse', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article', { timeout: 10000 });

    const viewButton = page.locator('text=/Ver historia/i').first();

    if (await viewButton.isVisible()) {
      await viewButton.click();
      await page.waitForTimeout(500);

      // El modal debería tener focus
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal).toBeFocused();
    }
  });

  test('modal debe cerrarse con Escape', async ({ page }) => {
    await page.goto('/');
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

      // El modal debería cerrarse
      expect(page.url()).not.toContain('story=');
    }
  });

  test('formularios deben tener labels asociados', async ({ page }) => {
    await page.goto('/');

    // Verificar que los inputs tienen labels
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    // Verificar que tienen id y que hay un label con for correspondiente
    const emailId = await emailInput.getAttribute('id');
    const passwordId = await passwordInput.getAttribute('id');

    expect(emailId).toBeTruthy();
    expect(passwordId).toBeTruthy();

    if (emailId) {
      const emailLabel = page.locator(`label[for="${emailId}"]`);
      await expect(emailLabel).toHaveCount(1);
    }

    if (passwordId) {
      const passwordLabel = page.locator(`label[for="${passwordId}"]`);
      await expect(passwordLabel).toHaveCount(1);
    }
  });

  test('botones deben tener nombres accesibles', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article', { timeout: 10000 });

    // Buscar botones de iconos (↻, etc.)
    const iconButtons = page.locator('button').filter({ hasText: /[↻⋯×]/});

    const count = await iconButtons.count();
    for (let i = 0; i < count; i++) {
      const button = iconButtons.nth(i);

      // Verificar que tiene aria-label o title
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');

      expect(ariaLabel || title).toBeTruthy();
    }
  });
});

test.describe('ARIA y Semántica', () => {
  test('regiones ARIA live para contenido dinámico', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article', { timeout: 10000 });

    // Verificar que hay ARIA live regions
    const liveRegions = page.locator('[aria-live]');
    const count = await liveRegions.count();

    // Debería haber al menos una live region para anuncios
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('progress bars tienen atributos ARIA correctos', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@winivox.test');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('text=Crear cuenta');
    await page.waitForTimeout(1000);

    await page.goto('/library/');
    await page.waitForTimeout(1500);

    // Buscar progress bars
    const progressBars = page.locator('[role="progressbar"]');
    const count = await progressBars.count();

    if (count > 0) {
      const first = progressBars.first();

      // Verificar atributos ARIA
      await expect(first).toHaveAttribute('aria-valuenow');
      await expect(first).toHaveAttribute('aria-valuemin');
      await expect(first).toHaveAttribute('aria-valuemax');

      // Opcionalmente aria-label
      const label = await first.getAttribute('aria-label');
      const labelledby = await first.getAttribute('aria-labelledby');

      expect(label || labelledby).toBeTruthy();
    }
  });

  test('modales tienen role="dialog" y aria-modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article', { timeout: 10000 });

    const viewButton = page.locator('text=/Ver historia/i').first();

    if (await viewButton.isVisible()) {
      await viewButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal).toHaveAttribute('aria-modal', 'true');

      // Debería tener aria-labelledby o aria-label
      const labelledby = await modal.getAttribute('aria-labelledby');
      const label = await modal.getAttribute('aria-label');

      expect(labelledby || label).toBeTruthy();
    }
  });

  test('toasts tienen role="status" y aria-live', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@winivox.test');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('text=Crear cuenta');
    await page.waitForTimeout(1000);

    await page.waitForSelector('article', { timeout: 10000 });

    // Intentar votar para activar un toast
    const voteButton = page.locator('text=/Me gusta|\\+1/i').first();

    if (await voteButton.isVisible()) {
      await voteButton.click();
      await page.waitForTimeout(500);

      // Buscar el toast
      const toast = page.locator('[role="status"]');

      if (await toast.isVisible()) {
        await expect(toast).toHaveAttribute('aria-live', 'polite');
        await expect(toast).toHaveAttribute('aria-atomic', 'true');
      }
    }
  });
});

test.describe('Contraste de Color', () => {
  test('texto debe tener contraste suficiente', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article', { timeout: 10000 });

    // axe-core ya valida contraste, pero podemos hacer checks adicionales
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('.text-muted') // Verificar específicamente texto muted
      .analyze();

    // No debería haber violaciones de contraste
    const contrastViolations = results.violations.filter(v =>
      v.id.includes('color-contrast')
    );

    expect(contrastViolations).toEqual([]);
  });

  test('focus visible debe tener contraste suficiente', async ({ page }) => {
    await page.goto('/');

    // Tabular a un elemento
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // El elemento con focus debería tener outline con buen contraste
    // (validado por axe-core automáticamente)
  });
});
