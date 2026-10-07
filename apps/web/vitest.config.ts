import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    env: { TZ: 'America/Sao_Paulo' },
    coverage: { include: ['src/features/**/components/**'], thresholds: { lines: 70, branches: 70 } },
  },
});
