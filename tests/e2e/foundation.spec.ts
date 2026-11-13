import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort('blockedbyclient');
  });
  await page.goto('/');
});

test('clearly labels the foundation and loads without browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.reload();
  await expect(page).toHaveTitle('Unpause Languages · Foundations');
  await expect(page.getByRole('heading', { name: 'Engineering foundations' })).toBeVisible();
  await expect(page.getByText('No courses are available in this foundation build.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('supports the complete sample interaction by keyboard with visible focus', async ({ page }) => {
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page.keyboard.press('Tab');
  const field = page.getByRole('textbox', { name: 'Sample text' });
  await expect(field).toBeFocused();
  expect(await field.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
  await page.keyboard.type('Learn at your pace.');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Preview sample' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Learn at your pace.');
});

test('announces an error and focuses the invalid field', async ({ page }) => {
  await page.getByRole('button', { name: 'Preview sample' }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter sample text to preview.');
  await expect(page.getByRole('textbox', { name: 'Sample text' })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('textbox', { name: 'Sample text' })).toBeFocused();
});

test('respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const duration = await page.getByRole('button', { name: 'Preview sample' }).evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(duration).toBe('0s');
  expect(await page.locator('body').evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
});

test('has no automated WCAG A/AA findings in the initial and error states', async ({ page }) => {
  const initial = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(initial.violations).toEqual([]);
  await page.getByRole('button', { name: 'Preview sample' }).click();
  const invalid = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(invalid.violations).toEqual([]);
});

test('reflows without horizontal scrolling at normal and enlarged text sizes', async ({ page }) => {
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(await overflow()).toBe(false);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await overflow()).toBe(false);
  await expect(page.getByRole('button', { name: 'Preview sample' })).toBeVisible();
});

test('shows a useful not-found page without inventing learning routes', async ({ page }) => {
  await page.goto('/not-a-course');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Return to foundations' }).click();
  await expect(page.getByRole('heading', { name: 'Engineering foundations' })).toBeVisible();
});
