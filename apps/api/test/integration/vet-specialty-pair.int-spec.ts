import { testDb } from '../support/test-db';

// 005/T004, Pergunta 6 (arbitragem de C4): o par veterinário e especialidade repetido é recusado pelo banco.
describe('unicidade do par veterinário e especialidade', () => {
  beforeEach(() => testDb.truncate());
  afterAll(() => testDb.close());

  it('o segundo vínculo do mesmo par é recusado pela chave composta', async () => {
    const { rows } = await testDb.sql.query<{ id: number }>(
      "insert into vets (first_name, last_name, updated_at) values ('Paula', 'Rezende', now()) returning id",
    );
    const vetId = rows[0]?.id;
    await testDb.sql.query('insert into vet_specialties (vet_id, specialty_id) values ($1, 1)', [vetId]);
    await expect(
      testDb.sql.query('insert into vet_specialties (vet_id, specialty_id) values ($1, 1)', [vetId]),
    ).rejects.toMatchObject({ constraint: 'vet_specialties_pkey' });
    await testDb.sql.query('insert into vet_specialties (vet_id, specialty_id) values ($1, 2)', [vetId]);
    expect(await testDb.count('vet_specialties', { vet_id: vetId })).toBe(2);
  });
});
