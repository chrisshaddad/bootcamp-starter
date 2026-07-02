import { nestJsConfig } from '@repo/eslint-config/nest-js';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nestJsConfig,
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'eslint.config.mjs',
      'prisma.config.ts',
      'prisma/**',
    ],
  },
];
