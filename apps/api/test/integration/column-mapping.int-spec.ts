import { readPrismaModels } from '../support/prisma-schema';
import { testDb } from '../support/test-db';

// P3: toda coluna tem o nome declarado no mapeamento, e ele é o mesmo da migração aplicada.
describe('mapeamento de colunas (P3)', () => {
  const models = readPrismaModels();
  afterAll(() => testDb.close());

  it('existe pelo menos um modelo mapeado', () => {
    expect(models.length).toBeGreaterThan(0);
  });

  it.each(models.map((m) => [m.model, m] as const))(
    '%s declara @@map e @map em todo campo escalar',
    (_name, m) => {
      expect(m.table).not.toBeNull();
      expect(m.fields.filter((f) => f.column === null).map((f) => f.field)).toEqual([]);
    },
  );

  it.each(models.map((m) => [m.model, m] as const))(
    '%s: cada coluna declarada existe no banco, com o mesmo tamanho',
    async (_n, m) => {
      const { rows } = await testDb.sql.query<{
        column_name: string;
        character_maximum_length: number | null;
      }>(
        'select column_name, character_maximum_length from information_schema.columns where table_schema = $1 and table_name = $2',
        ['public', m.table],
      );
      const db = new Map(rows.map((r) => [r.column_name, r.character_maximum_length]));
      for (const f of m.fields) {
        expect({ field: f.field, exists: db.has(f.column ?? '') }).toEqual({ field: f.field, exists: true });
        if (f.length !== null)
          expect({ field: f.field, length: db.get(f.column ?? '') }).toEqual({
            field: f.field,
            length: f.length,
          });
      }
      expect(rows.length).toBe(m.fields.length);
    },
  );
});
