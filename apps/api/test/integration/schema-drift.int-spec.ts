import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '../..');
const raw = JSON.parse(readFileSync(join(root, 'prisma/raw-sql-objects.json'), 'utf8')) as {
  checks: Record<string, string>;
  indexes: Record<string, string>;
};

// P5: o esquema muda só por migração; schema.prisma e migrações aplicadas não podem divergir.
// A única diferença aceita é a remoção dos objetos de SQL cru listados em raw-sql-objects.json.
describe('migrações versionadas (P5)', () => {
  it('o banco migrado coincide com o schema.prisma, a menos dos objetos de SQL cru declarados', () => {
    const out = execSync(
      'npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script',
      {
        cwd: root,
        env: process.env,
      },
    ).toString();
    const statements = out
      .replace(/--.*$/gm, '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !Object.keys(raw.indexes).some((name) => s === `DROP INDEX "${name}"`));
    expect(statements).toEqual([]);
  });

  it('todo objeto de SQL cru declarado existe no banco migrado', async () => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const { rows } = await pool.query<{ indexname: string }>(
      "select indexname from pg_indexes where schemaname = 'public'",
    );
    await pool.end();
    const present = new Set(rows.map((r) => r.indexname));
    expect(Object.keys(raw.indexes).filter((n) => !present.has(n))).toEqual([]);
  });

  it('toda restrição CHECK declarada existe no banco migrado (012)', async () => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const { rows } = await pool.query<{ conname: string }>(
      "select conname from pg_constraint where contype = 'c' and connamespace = 'public'::regnamespace",
    );
    await pool.end();
    const present = new Set(rows.map((r) => r.conname));
    expect(Object.keys(raw.checks).filter((n) => !present.has(n))).toEqual([]);
  });
});
