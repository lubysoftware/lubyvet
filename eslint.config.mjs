// Padrões de docs/padroes/codigo.md aplicados por máquina.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.next/**',
      '**/next-env.d.ts',
      'apps/api/src/generated/**',
      '**/*.config.{js,mjs,cjs}',
      '**/.dependency-cruiser.cjs',
    ],
  },
  ...tseslint.configs.strict,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-extraneous-class': 'off',
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'Use união de literais com as const (docs/padroes/codigo.md).',
        },
      ],
    },
  },
  {
    // NestJS injeta pelo tipo do construtor: o metadado de decorator precisa do import real.
    files: ['apps/api/**/*.ts'],
    languageOptions: { parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true } },
  },
  {
    files: [
      '**/*.spec.ts',
      '**/*.int-spec.ts',
      '**/*.e2e-spec.ts',
      '**/*.test.tsx',
      '**/test/**/*.ts',
      '**/e2e/**/*.ts',
    ],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
