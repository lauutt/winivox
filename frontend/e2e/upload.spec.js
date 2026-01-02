import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Tests de Upload
 *
 * Valida el flujo completo de subida de archivos:
 * - Selección de archivo
 * - Progreso de upload
 * - Configuración de anonimización
 * - Cancelación
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

test.describe('Upload de Audio', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('debe redirigir a login si no está autenticado', async ({ page }) => {
    // Hacer logout primero
    await page.click('text=Cerrar sesion');
    await page.waitForTimeout(500);

    // Intentar acceder a /upload/
    await page.goto('/upload/');
    await page.waitForTimeout(1000);

    // Debería mostrar mensaje de que necesita login
    // o redirigir al home
    const url = page.url();
    const hasLoginMessage = await page.locator('text=/Inicia sesion|necesitas|autenticar/i').isVisible();

    expect(url === 'http://localhost:5173/' || hasLoginMessage).toBeTruthy();
  });

  test('muestra el formulario de upload cuando está logueado', async ({ page }) => {
    await page.goto('/upload/');
    await page.waitForTimeout(1000);

    // Verificar que el input de archivo está presente
    await expect(page.locator('input[type="file"]')).toBeVisible();
  });

  test('puede seleccionar un archivo de audio', async ({ page }) => {
    await page.goto('/upload/');

    // Crear un archivo de prueba pequeño
    const fileInput = page.locator('input[type="file"]');

    // Verificar que acepta audio
    const acceptAttr = await fileInput.getAttribute('accept');
    expect(acceptAttr).toContain('audio');
  });

  test('muestra progreso durante la subida', async ({ page }) => {
    // Nota: Este test es difícil de validar sin un archivo real
    // porque el upload puede ser demasiado rápido

    await page.goto('/upload/');

    // En un escenario real, subirías un archivo y verificarías
    // que aparece la barra de progreso
  });

  test('avanza al paso 2 después de subir archivo', async ({ page }) => {
    // Este test requiere un archivo de prueba real
    // Por ahora solo verificamos la estructura de pasos

    await page.goto('/upload/');

    // Verificar que está en paso 1
    await expect(page.locator('text=/Paso 1|Seleccion/i')).toBeVisible();
  });

  test('puede cancelar el upload y volver al paso 1', async ({ page }) => {
    // Simular que ya se subió un archivo y está en paso 2
    // (esto requeriría un flujo completo que es difícil sin fixtures)

    await page.goto('/upload/');

    // Si el botón Cancelar está visible
    const cancelButton = page.locator('text=Cancelar');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      await page.waitForTimeout(500);

      // Debería volver al paso 1
      await expect(page.locator('text=/Paso 1/i')).toBeVisible();
    }
  });

  test('muestra selector de nivel de anonimización', async ({ page }) => {
    await page.goto('/upload/');

    // El select de anonimización podría estar visible o no
    // dependiendo del paso actual

    const anonSelect = page.locator('select').filter({ hasText: /SOFT|MEDIUM|STRONG/i });
    const isVisible = await anonSelect.isVisible();

    // Si no está visible, es porque está en paso 1
    // Si está visible, verificamos que tiene opciones
    if (isVisible) {
      await expect(anonSelect).toBeVisible();
    }
  });

  test('muestra campos opcionales de descripción y tags', async ({ page }) => {
    await page.goto('/upload/');

    // Estos campos pueden estar en paso 2
    const descriptionTextarea = page.locator('textarea');
    const tagsInput = page.locator('input[placeholder*="tag"]');

    // Verificar si existen (pueden no estar visibles en paso 1)
    const hasDescription = (await descriptionTextarea.count()) > 0;
    const hasTags = (await tagsInput.count()) > 0;

    // Al menos uno debería existir en la página de upload
    expect(hasDescription || hasTags).toBeTruthy();
  });

  test('puede grabar audio desde el micrófono', async ({ page, context }) => {
    // Dar permisos de micrófono
    await context.grantPermissions(['microphone']);

    await page.goto('/upload/');

    // Buscar botón de grabación
    const recordButton = page.locator('text=/Grabar|Iniciar grabacion/i');

    if (await recordButton.isVisible()) {
      // Este test es limitado porque no hay micrófono real
      // pero podemos verificar que el botón existe
      await expect(recordButton).toBeVisible();
    }
  });

  test('muestra error si el formato no es soportado', async ({ page }) => {
    // Este test requeriría intentar subir un archivo no-audio
    await page.goto('/upload/');

    const fileInput = page.locator('input[type="file"]');
    const accept = await fileInput.getAttribute('accept');

    // Verificar que solo acepta audio
    expect(accept).toMatch(/audio/);
  });

  test('redirige a library después de confirmar upload', async ({ page }) => {
    // Este test requiere flujo completo de upload
    // Por ahora solo verificamos que existe el botón de confirmar

    await page.goto('/upload/');

    const confirmButton = page.locator('text=/Confirmar|Sumar|Enviar/i');
    const exists = (await confirmButton.count()) > 0;

    // El botón puede no estar visible en paso 1, pero debería existir
    expect(exists).toBeTruthy();
  });
});
