import { defineConfig, devices } from '@playwright/test';

/**
 * Fluxo e acessibilidade do web contra a pilha inteira (docs/padroes/testes.md): Postgres, Redis e
 * RabbitMQ reais em Testcontainers, a API compilada e o Next de produção, subidos no global setup.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  globalSetup: './e2e/stack.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3100',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
