// Níveis de teste de docs/padroes/testes.md.
const swc = [
  '@swc/jest',
  {
    jsc: {
      parser: { syntax: 'typescript', decorators: true },
      transform: { legacyDecorator: true, decoratorMetadata: true },
      target: 'es2023',
    },
  },
];
const base = {
  testEnvironment: 'node',
  transform: { '^.+\\.ts$': swc },
  moduleNameMapper: {
    '^@lubyvet/contracts$': '<rootDir>/../../packages/contracts/src',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFiles: ['<rootDir>/test/support/env.ts'],
};
/** @type {import('jest').Config} */
module.exports = {
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/modules/*/domain/**/*.ts',
    'src/modules/*/application/**/*.ts',
    'src/shared/domain/**/*.ts',
    '!**/*.spec.ts',
    '!**/*.port.ts',
  ],
  // D44: domínio e casos de uso com pelo menos 90% de linhas e de ramos.
  coverageThreshold: { global: { lines: 90, branches: 90 } },
  projects: [
    { ...base, displayName: 'unit', roots: ['<rootDir>/src'], testMatch: ['**/*.spec.ts'] },
    {
      ...base,
      displayName: 'integration',
      roots: ['<rootDir>/test/integration'],
      testMatch: ['**/*.int-spec.ts'],
      globalSetup: '<rootDir>/test/support/global-setup.ts',
      globalTeardown: '<rootDir>/test/support/global-teardown.ts',
    },
    {
      ...base,
      displayName: 'e2e',
      roots: ['<rootDir>/test/e2e'],
      testMatch: ['**/*.e2e-spec.ts'],
      globalSetup: '<rootDir>/test/support/global-setup.ts',
      globalTeardown: '<rootDir>/test/support/global-teardown.ts',
    },
    {
      ...base,
      displayName: 'perf',
      roots: ['<rootDir>/test/perf'],
      testMatch: ['**/*.perf-spec.ts'],
      globalSetup: '<rootDir>/test/support/global-setup.ts',
      globalTeardown: '<rootDir>/test/support/global-teardown.ts',
    },
  ],
};
