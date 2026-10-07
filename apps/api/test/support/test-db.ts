import { PrismaPg } from '@prisma/adapter-pg';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { PrismaClient } from '../../src/generated/prisma/client';

const clients: PrismaClient[] = [];

/** As seis espécies da carga inicial, na ordem da migração: ids 1 a 6. */
export const SPECIES_SEED = ['Gato', 'Cão', 'Lagarto', 'Cobra', 'Ave', 'Hamster'] as const;
export const SPECIES = { cat: 1, dog: 2, lizard: 3, snake: 4, bird: 5, hamster: 6 } as const;
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
    // A memória do catálogo (005) não pode atravessar testes.
    if (process.env.REDIS_URL) {
      const r = new Redis(process.env.REDIS_URL);
      const keys = await r.keys('lubyvet:vets:*');
      if (keys.length) await r.del(...keys);
      r.disconnect();
    }
    const { rows } = await testDb.sql.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' and tablename <> '_prisma_migrations'",
    );
    if (rows.length)
      await testDb.sql.query(
        `truncate ${rows.map((r) => `"${r.tablename}"`).join(', ')} restart identity cascade`,
      );
    // Vocabulário inicial (003/T003): recarregado depois de cada limpeza, com os mesmos ids (1 a 6).
    await testDb.sql.query(
      `insert into species (name, updated_at) values ${SPECIES_SEED.map((_, i) => `($${i + 1}, now())`).join(', ')}`,
      [...SPECIES_SEED],
    );
    await testDb.sql.query(
      "insert into specialties (name, updated_at) values ('Radiologia', now()), ('Cirurgia', now()), ('Odontologia', now())",
    );
    await testDb.seedUsers();
  },
  /** Usuários de teste: 1 admin, 2 writer, 3 reader, todos com a senha sintética (D18). */
  async seedUsers(): Promise<void> {
    await testDb.sql.query(
      `insert into users (id, name, login, password_hash, role, updated_at) values
        (1, 'Ana Admin', 'admin@lubyvet.test', $1, 'admin', now()),
        (2, 'Carla Escrita', 'writer@lubyvet.test', $1, 'writer', now()),
        (3, 'Rui Leitura', 'reader@lubyvet.test', $1, 'reader', now())
       on conflict (id) do update set status = 'active', failed_attempts = 0, locked_until = null`,
      [process.env.TEST_PASSWORD_HASH],
    );
    await testDb.sql.query("select setval('users_id_seq', 3)");
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
