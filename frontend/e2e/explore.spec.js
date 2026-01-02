import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Script Exploratorio de UX y Accesibilidad para Winivox
 * Este script navega la aplicación, captura screenshots y ejecuta auditorías de accesibilidad
 */

test.describe('Análisis Exploratorio de Winivox', () => {
  test('Explorar FeedPage - Desktop', async ({ page }) => {
    await page.goto('/');

    // Esperar a que cargue el contenido
    await page.waitForLoadState('networkidle');

    // Capturar screenshot completo
    await page.screenshot({
      path: 'e2e/screenshots/feed-desktop-full.png',
      fullPage: true
    });

    // Capturar viewport
    await page.screenshot({
      path: 'e2e/screenshots/feed-desktop-viewport.png'
    });

    // Auditoría de accesibilidad
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    console.log('\n=== FEED PAGE - ACCESSIBILITY VIOLATIONS ===');
    console.log(`Total violations: ${accessibilityScanResults.violations.length}`);
    accessibilityScanResults.violations.forEach((violation, index) => {
      console.log(`\n[${index + 1}] ${violation.id}`);
      console.log(`   Impact: ${violation.impact}`);
      console.log(`   Description: ${violation.description}`);
      console.log(`   Help: ${violation.help}`);
      console.log(`   Help URL: ${violation.helpUrl}`);
      console.log(`   Affected elements: ${violation.nodes.length}`);
      violation.nodes.forEach((node, nodeIndex) => {
        console.log(`     ${nodeIndex + 1}. ${node.html.substring(0, 100)}...`);
      });
    });

    // Verificar elementos clave
    const hasAuthPanel = await page.locator('input[type="email"]').isVisible();
    const hasFeedCards = await page.locator('article').count();
    const hasTags = await page.locator('.chip').count();
    const hasNavigation = await page.locator('nav').isVisible();

    console.log('\n=== FEED PAGE - ELEMENTS FOUND ===');
    console.log(`Auth panel visible: ${hasAuthPanel}`);
    console.log(`Feed cards: ${hasFeedCards}`);
    console.log(`Tags: ${hasTags}`);
    console.log(`Navigation: ${hasNavigation}`);
  });

  test('Explorar FeedPage - Mobile', async ({ page }) => {
    // Configurar viewport móvil
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Capturar screenshot móvil
    await page.screenshot({
      path: 'e2e/screenshots/feed-mobile-full.png',
      fullPage: true
    });

    await page.screenshot({
      path: 'e2e/screenshots/feed-mobile-viewport.png'
    });

    console.log('\n=== MOBILE VIEW CAPTURED ===');
  });

  test('Explorar LibraryPage', async ({ page }) => {
    await page.goto('/library/');

    await page.waitForLoadState('networkidle');

    // Screenshot
    await page.screenshot({
      path: 'e2e/screenshots/library-desktop.png',
      fullPage: true
    });

    // Auditoría de accesibilidad
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    console.log('\n=== LIBRARY PAGE - ACCESSIBILITY VIOLATIONS ===');
    console.log(`Total violations: ${accessibilityScanResults.violations.length}`);
    accessibilityScanResults.violations.forEach((violation, index) => {
      console.log(`\n[${index + 1}] ${violation.id}: ${violation.description}`);
      console.log(`   Impact: ${violation.impact}`);
    });

    // Verificar que requiere login
    const requiresLogin = await page.locator('text=Necesitas iniciar sesion').isVisible();
    console.log(`\n=== LIBRARY PAGE - AUTH GATE ===`);
    console.log(`Requires login: ${requiresLogin}`);
  });

  test('Explorar UploadPage', async ({ page }) => {
    await page.goto('/upload/');

    await page.waitForLoadState('networkidle');

    // Screenshot
    await page.screenshot({
      path: 'e2e/screenshots/upload-desktop.png',
      fullPage: true
    });

    // Auditoría de accesibilidad
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    console.log('\n=== UPLOAD PAGE - ACCESSIBILITY VIOLATIONS ===');
    console.log(`Total violations: ${accessibilityScanResults.violations.length}`);
    accessibilityScanResults.violations.forEach((violation, index) => {
      console.log(`\n[${index + 1}] ${violation.id}: ${violation.description}`);
      console.log(`   Impact: ${violation.impact}`);
    });
  });

  test('Probar Navegación por Teclado', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    console.log('\n=== KEYBOARD NAVIGATION TEST ===');

    // Intentar detectar skip link
    await page.keyboard.press('Tab');
    let focused = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el.tagName,
        text: el.textContent?.substring(0, 50),
        href: el.getAttribute('href'),
        ariaLabel: el.getAttribute('aria-label'),
        hasOutline: window.getComputedStyle(el).outline !== 'none'
      };
    });

    console.log('First Tab stop:', focused);

    // Tab 5 veces y documentar
    for (let i = 2; i <= 5; i++) {
      await page.keyboard.press('Tab');
      focused = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el.tagName,
          text: el.textContent?.substring(0, 50),
          type: el.getAttribute('type'),
          hasVisibleOutline: window.getComputedStyle(el).outline !== 'none'
        };
      });
      console.log(`Tab ${i}:`, focused);
    }

    // Capturar screenshot con focus visible
    await page.screenshot({
      path: 'e2e/screenshots/keyboard-navigation.png'
    });
  });

  test('Probar Contraste de Colores', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verificar contraste de textos muted
    const contrastInfo = await page.evaluate(() => {
      const mutedElements = document.querySelectorAll('.text-muted');
      const results = [];

      mutedElements.forEach((el, index) => {
        if (index < 5) { // Solo primeros 5 para no saturar
          const styles = window.getComputedStyle(el);
          const bgEl = el.closest('[class*="bg-"]') || document.body;
          const bgStyles = window.getComputedStyle(bgEl);

          results.push({
            text: el.textContent.substring(0, 30),
            color: styles.color,
            backgroundColor: bgStyles.backgroundColor || 'inherit',
            fontSize: styles.fontSize
          });
        }
      });

      return results;
    });

    console.log('\n=== COLOR CONTRAST ANALYSIS ===');
    contrastInfo.forEach((info, index) => {
      console.log(`\nElement ${index + 1}:`);
      console.log(`  Text: "${info.text}"`);
      console.log(`  Color: ${info.color}`);
      console.log(`  Background: ${info.backgroundColor}`);
      console.log(`  Font Size: ${info.fontSize}`);
    });
  });

  test('Probar Interacciones Básicas del Feed', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    console.log('\n=== FEED INTERACTIONS TEST ===');

    // Verificar si hay historias
    const storyCount = await page.locator('article').count();
    console.log(`Stories in feed: ${storyCount}`);

    if (storyCount > 0) {
      // Hacer click en primer tag si existe
      const tagCount = await page.locator('.chip').count();
      console.log(`Tags available: ${tagCount}`);

      if (tagCount > 0) {
        const firstTagText = await page.locator('.chip').first().textContent();
        await page.locator('.chip').first().click();

        // Esperar actualización
        await page.waitForTimeout(500);

        // Verificar URL cambió
        const url = page.url();
        console.log(`After clicking tag "${firstTagText}", URL: ${url}`);

        // Screenshot del estado filtrado
        await page.screenshot({
          path: 'e2e/screenshots/feed-filtered-by-tag.png'
        });
      }

      // Intentar abrir detalle de historia
      const viewStoryButtons = await page.locator('text=Ver historia').count();
      console.log(`"Ver historia" buttons: ${viewStoryButtons}`);

      if (viewStoryButtons > 0) {
        await page.locator('text=Ver historia').first().click();
        await page.waitForTimeout(500);

        const urlWithStory = page.url();
        console.log(`After clicking "Ver historia", URL: ${urlWithStory}`);

        // Verificar si aparece transcripción
        const hasTranscript = await page.locator('text=Transcripcion completa').isVisible();
        console.log(`Transcript visible: ${hasTranscript}`);

        // Screenshot del detalle
        await page.screenshot({
          path: 'e2e/screenshots/story-detail.png',
          fullPage: true
        });

        // Probar cerrar con Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        const urlAfterEscape = page.url();
        console.log(`After Escape key, URL: ${urlAfterEscape}`);
        console.log(`Escape closed modal: ${!urlAfterEscape.includes('story=')}`);
      }
    }
  });
});
