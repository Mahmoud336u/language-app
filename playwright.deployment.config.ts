import { defineConfig } from '@playwright/test';
import config from './playwright.config';

export default defineConfig(config, {
  testDir: './tests/e2e',
  testMatch: 'deployment.spec.ts',
  use: { baseURL: 'http://127.0.0.1:8788' },
  webServer: {
    command: 'npm run preview:cloudflare',
    url: 'http://127.0.0.1:8788',
    reuseExistingServer: false,
    timeout: 60000
  }
});
