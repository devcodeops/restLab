const nextCore = await import('eslint-config-next/core-web-vitals').then((mod) => mod.default);
const nextTs = await import('eslint-config-next/typescript').then((mod) => mod.default);

const config = [
  {
    ignores: [
      '.next/**',
      'coverage/**',
      'test/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      'eslint.config.mjs',
    ],
  },
  ...nextCore,
  ...nextTs,
  {
    rules: {
      // Transitional: Next 16 enables this by default; current app uses controlled bootstrapping effects.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default config;
