import { execSync } from 'node:child_process';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

// Um Postgres real por execução, com as migrações aplicadas uma vez (docs/padroes/testes.md).
export default async function globalSetup(): Promise<void> {
  const container = await new PostgreSqlContainer('postgres:17-alpine').start();
  const url = container.getConnectionUri();
  process.env.DATABASE_URL = url;
  execSync('npx prisma migrate deploy', {
    cwd: `${__dirname}/../..`,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
  (globalThis as { __pg?: { stop(): Promise<unknown> } }).__pg = container;
}
