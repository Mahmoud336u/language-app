import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

process.env.TZ = 'UTC';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    passWithNoTests: false,
    maxWorkers: 2,
    sequence: { seed: 20261112 },
    clearMocks: true,
    restoreMocks: true
  }
});
