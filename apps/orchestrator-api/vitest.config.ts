import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@restlab/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@restlab/db': path.resolve(__dirname, '../../packages/db/src'),
    },
  },
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.d.ts', '**/main.ts', '**/app.module.ts', '**/logging.interceptor.ts'],
    },
  },
});

