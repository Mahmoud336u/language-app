import { expect, test } from '@playwright/test';

test('serves the built app and direct navigation with Cloudflare SPA fallback', async ({ page }) => {
  const response = await page.goto('/foundation');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Engineering foundations' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Sample text' })).toBeVisible();
});

test('returns 404 for a missing asset instead of serving HTML', async ({ request }) => {
  const response = await request.get('/assets/does-not-exist.js');
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain('<div id="root">');
});

test('applies restrictive static headers without third-party script access', async ({ page }) => {
  const response = await page.goto('/');
  expect(response).not.toBeNull();
  const headers = response?.headers() ?? {};
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('no-referrer');
  expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
  expect(headers['content-security-policy']).toContain("script-src 'self'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['content-security-policy']).not.toContain('unsafe-eval');
  expect(headers['content-security-policy']).not.toContain('unsafe-inline');
});
