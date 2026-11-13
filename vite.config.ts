import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { copyFileSync, mkdirSync } from 'node:fs';

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'foundation-static-entry',
    apply: 'build',
    closeBundle() {
      const directory = new URL('./dist/foundation/', import.meta.url);
      mkdirSync(directory, { recursive: true });
      copyFileSync(new URL('./dist/index.html', import.meta.url), new URL('index.html', directory));
    }
  }]
});
