import { execSync } from 'node:child_process';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import argon2 from 'argon2';

// Postgres e Redis reais por execução, com as migrações aplicadas uma vez (docs/padroes/testes.md).
export default async function globalSetup(): Promise<void> {
  const [pg, redis] = await Promise.all([
    new PostgreSqlContainer('postgres:17-alpine').start(),
    new RedisContainer('redis:8-alpine').start(),
  ]);
  const url = pg.getConnectionUri();
  process.env.DATABASE_URL = url;
  process.env.REDIS_URL = redis.getConnectionUrl();
  // Senha sintética dos usuários de teste, um por papel (D18).
  process.env.TEST_PASSWORD_HASH = await argon2.hash('senha-de-teste-123');
  execSync('npx prisma migrate deploy', {
    cwd: `${__dirname}/../..`,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
  (globalThis as { __containers?: { stop(): Promise<unknown> }[] }).__containers = [pg, redis];
}
