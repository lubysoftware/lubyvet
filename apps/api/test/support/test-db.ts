import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../../src/generated/prisma/client';

const clients: PrismaClient[] = [];
const pool = (): Pool => new Pool({ connectionString: process.env.DATABASE_URL });

/** Acesso ao Postgres do teste: cliente Prisma, SQL cru e limpeza entre testes. */
export const testDb = {
  sql: pool(),
  client(): PrismaClient {
    if (!clients[0]) clients[0] = testDb.newClient();
    return clients[0];
  },
  /** Cliente com conexão própria, para os testes de concorrência. */
  newClient(): PrismaClient {
    const c = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
    });
    clients.push(c);
    return c;
  },
  async truncate(): Promise<void> {
    const { rows } = await testDb.sql.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' and tablename <> '_prisma_migrations'",
    );
    if (rows.length)
      await testDb.sql.query(
        `truncate ${rows.map((r) => `"${r.tablename}"`).join(', ')} restart identity cascade`,
      );
  },
  async count(table: string, where: Record<string, unknown> = {}): Promise<number> {
    const keys = Object.keys(where);
    const clause = keys.length ? ` where ${keys.map((k, i) => `"${k}" = $${i + 1}`).join(' and ')}` : '';
    const { rows } = await testDb.sql.query<{ n: string }>(
      `select count(*)::text as n from "${table}"${clause}`,
      Object.values(where),
    );
    return Number(rows[0]?.n ?? 0);
  },
  async close(): Promise<void> {
    await Promise.all(clients.map((c) => c.$disconnect()));
    await testDb.sql.end();
  },
};
