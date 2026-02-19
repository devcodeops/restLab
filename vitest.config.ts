import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@restlab/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@restlab/db': path.resolve(__dirname, 'packages/db/src'),
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    globals: true,
    include: [
      'packages/**/*.test.ts',
      'apps/**/*.test.ts',
      'apps/**/*.test.tsx',
    ],
    environmentMatchGlobs: [
      ['apps/web/**/*.test.tsx', 'jsdom'],
    ],
    setupFiles: ['apps/web/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'apps/web/components/**/*.tsx',
        'apps/web/lib/**/*.ts*',
        'apps/orchestrator-api/src/**/*.ts',
        'apps/svc-alpha/src/**/*.ts',
        'apps/svc-beta/src/**/*.ts',
        'apps/svc-gamma/src/**/*.ts',
        'packages/shared/src/**/*.ts',
      ],
      exclude: [
        '**/*.d.ts',
        '**/main.ts',
        '**/app.module.ts',
        '**/logging.interceptor.ts',
      ],
    },
  },
});
