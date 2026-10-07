import { type ChildProcess, execSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RabbitMQContainer } from '@testcontainers/rabbitmq';
import { RedisContainer } from '@testcontainers/redis';
import argon2 from 'argon2';
import { Pool } from 'pg';
import { PASSWORD, USERS } from './support';

const root = join(__dirname, '../../..');
const API_PORT = 3101;
const WEB_PORT = 3100;

async function waitFor(url: string, child: ChildProcess): Promise<void> {
  for (let i = 0; i < 240; i++) {
    if (child.exitCode !== null) throw new Error(`${url}: o processo terminou com ${child.exitCode}`);
    try {
      if ((await fetch(url)).status < 500) return;
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${url} não respondeu`);
}

/** Sobe a pilha, semeia os três usuários (um por papel, D18) e devolve a derrubada. */
export default async function stack(): Promise<() => Promise<void>> {
  const [pg, redis, rabbit] = await Promise.all([
    new PostgreSqlContainer('postgres:17-alpine').start(),
    new RedisContainer('redis:8-alpine').start(),
    new RabbitMQContainer('rabbitmq:4-alpine').start(),
  ]);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    TZ: 'America/Sao_Paulo',
    NODE_ENV: 'test',
    LOG_LEVEL: 'warn',
    DATABASE_URL: pg.getConnectionUri(),
    REDIS_URL: redis.getConnectionUrl(),
    RABBITMQ_URL: rabbit.getAmqpUrl(),
    API_URL: `http://localhost:${API_PORT}`,
    NEXT_DIST_DIR: '.next-e2e',
  };
  const run = (cmd: string, cwd: string) => execSync(cmd, { cwd: join(root, cwd), env, stdio: 'pipe' });
  run('bun run --cwd packages/contracts build', '.');
  run('../../node_modules/.bin/prisma migrate deploy', 'apps/api');
  run('bun run build', 'apps/api');
  // O rewrite de /api para a API é resolvido no build do Next, então o build usa a mesma API_URL.
  // O build reescreve o next-env.d.ts para a pasta do E2E; o versionado volta como estava.
  const nextEnv = join(root, 'apps/web/next-env.d.ts');
  const original = readFileSync(nextEnv, 'utf8');
  try {
    run('../../node_modules/.bin/next build', 'apps/web');
  } finally {
    writeFileSync(nextEnv, original);
  }

  const db = new Pool({ connectionString: env.DATABASE_URL });
  const hash = await argon2.hash(PASSWORD);
  for (const u of Object.values(USERS))
    await db.query(
      'insert into users (name, login, password_hash, role, updated_at) values ($1, $2, $3, $4, now())',
      [u.name, u.login, hash, u.role],
    );
  await db.end();

  const api = spawn('node', ['dist/main.js'], {
    cwd: join(root, 'apps/api'),
    env: { ...env, PORT: String(API_PORT) },
    stdio: 'inherit',
  });
  const web = spawn('../../node_modules/.bin/next', ['start', '-p', String(WEB_PORT)], {
    cwd: join(root, 'apps/web'),
    env,
    stdio: 'ignore',
  });
  await waitFor(`http://localhost:${API_PORT}/api/health/live`, api);
  await waitFor(`http://localhost:${WEB_PORT}/login`, web);

  return async () => {
    web.kill();
    api.kill();
    await Promise.all([pg.stop(), redis.stop(), rabbit.stop()]);
  };
}
