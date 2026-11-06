import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'prisma/dev.db',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        globalThis: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
  },
  {
    // Скрипты и сид по умолчанию логируют в консоль.
    files: ['scripts/**', 'prisma/**', '**/scripts/**'],
    rules: {
      'no-console': 'off',
    },
  },
);
