import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import onlyWarn from 'eslint-plugin-only-warn';
import globals from 'globals';

// Self-contained flat config for the NestJS API.
// `only-warn` downgrades every rule to a warning so `turbo run lint` never
// fails CI on style issues, while still surfacing them locally. Tighten later.
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'eslint.config.mjs',
      'prisma.config.ts',
      'prisma/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { plugins: { onlyWarn } },
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
);
