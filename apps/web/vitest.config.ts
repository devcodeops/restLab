import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@restlab/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@restlab/db': path.resolve(__dirname, '../../packages/db/src'),
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    globals: true,
    include: ['components/**/*.test.tsx', 'lib/**/*.test.ts', 'lib/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['components/**/*.tsx', 'lib/**/*.ts*'],
      exclude: ['**/*.d.ts'],
    },
  },
});
