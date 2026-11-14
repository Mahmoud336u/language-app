import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
export default defineConfig({
  testDir: './tests/contracts/session-browser',
  testMatch: '**/*.spec.ts',
  forbidOnly: true, fullyParallel: true, retries: 0, workers: 2,
  outputDir: 'test-results/storage',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/storage' }]],
  use: { baseURL: 'http://127.0.0.1:4174', timezoneId: 'UTC', locale: 'en-GB',
    trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'storage-chromium', use: { ...devices['Desktop Chrome'], launchOptions: executablePath ? { executablePath } : {} } },
    ...(process.env.CI ? [
      { name: 'storage-firefox', use: { ...devices['Desktop Firefox'] } },
      { name: 'storage-webkit', use: { ...devices['Desktop Safari'] } }
    ] : [])
  ],
  webServer: { command: 'npx vite --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/tests/contracts/session-browser/harness.html', reuseExistingServer: false, timeout: 30000 }
});
