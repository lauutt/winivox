import { test, expect } from '@playwright/test';

/**
 * Tests de Autenticación
 *
 * Valida el flujo completo de registro, login y logout
 */

test.describe('Autenticación', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('debe mostrar el panel de auth en la página principal', async ({ page }) => {
    await expect(page.locator('text=Correo')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('text=Ingresar')).toBeVisible();
    await expect(page.locator('text=Crear cuenta')).toBeVisible();
  });

  test('puede registrar un nuevo usuario', async ({ page }) => {
    const timestamp = Date.now();
    const email = `test-${timestamp}@winivox.test`;
    const password = 'testpass123';

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('text=Crear cuenta');

    // Esperar a que el registro complete
    await page.waitForTimeout(1000);

    // Verificar que el botón de logout aparece
    await expect(page.locator('text=Cerrar sesion')).toBeVisible();

    // Verificar que el panel de auth desaparece
    await expect(page.locator('text=Crear cuenta')).not.toBeVisible();
  });

  test('puede hacer login con credenciales válidas', async ({ page }) => {
    // Nota: Este test asume que existe un usuario test@winivox.test con password testpass123
    // En un entorno real, esto debería usar fixtures o setup de datos de prueba

    const email = 'test@winivox.test';
    const password = 'testpass123';

    // Primero intentar registrar el usuario (por si no existe)
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('text=Crear cuenta');
    await page.waitForTimeout(500);

    // Si ya estaba logueado, hacer logout
    const logoutButton = page.locator('text=Cerrar sesion');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(500);
    }

    // Ahora hacer login
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('text=Ingresar');

    await page.waitForTimeout(1000);

    // Verificar que el login fue exitoso
    await expect(page.locator('text=Cerrar sesion')).toBeVisible();
  });

  test('muestra error con credenciales inválidas', async ({ page }) => {
    await page.fill('input[type="email"]', 'noexiste@winivox.test');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('text=Ingresar');

    await page.waitForTimeout(1000);

    // Verificar que se muestra un mensaje de error
    const authPanel = page.locator('.surface').first();
    await expect(authPanel).toContainText(/error|inválid|incorrecto/i);
  });

  test('puede hacer logout', async ({ page }) => {
    // Primero hacer login
    const email = 'test@winivox.test';
    const password = 'testpass123';

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('text=Crear cuenta');
    await page.waitForTimeout(1000);

    // Verificar que está logueado
    await expect(page.locator('text=Cerrar sesion')).toBeVisible();

    // Hacer logout
    await page.click('text=Cerrar sesion');
    await page.waitForTimeout(500);

    // Verificar que volvió al estado de logout
    await expect(page.locator('text=Ingresar')).toBeVisible();
    await expect(page.locator('text=Cerrar sesion')).not.toBeVisible();
  });

  test('valida formato de email', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');

    await emailInput.fill('emailinvalido');
    await expect(emailInput).toHaveAttribute('type', 'email');

    // El navegador debería validar automáticamente
    const isValid = await emailInput.evaluate(el => el.checkValidity());
    expect(isValid).toBe(false);
  });

  test('no permite enviar formulario vacío', async ({ page }) => {
    const loginButton = page.locator('text=Ingresar');

    // Intentar hacer click sin llenar nada
    await loginButton.click();
    await page.waitForTimeout(500);

    // No debería haberse logueado
    await expect(page.locator('text=Cerrar sesion')).not.toBeVisible();
  });
});
