import { VetCatalogOutput } from '@lubyvet/contracts';
import { bootApp, type TestApp } from '../support/app';
import { testDb } from '../support/test-db';

const vet = async (first: string, last: string, specialtyIds: number[] = []) => {
  const { rows } = await testDb.sql.query<{ id: number }>(
    'insert into vets (first_name, last_name, updated_at) values ($1, $2, now()) returning id',
    [first, last],
  );
  for (const s of specialtyIds)
    await testDb.sql.query('insert into vet_specialties (vet_id, specialty_id) values ($1, $2)', [
      rows[0]?.id,
      s,
    ]);
};

// 005: T007 (catálogo), T008 (paginação), T013 (um formato só, sem campo de persistência).
describe('GET /api/vets', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  it('T007: nome, sobrenome e especialidades em ordem alfabética; sem especialidade vem lista vazia; nada é gravado', async () => {
    await vet('Paula', 'Rezende', [2, 1]);
    await vet('Caio', 'Álvares');
    const res = VetCatalogOutput.parse(
      (await t.api.get('/api/vets?pageSize=5').set('Accept', 'application/json').expect(200)).body,
    );
    expect(res.items.map((v) => v.lastName)).toEqual(['Álvares', 'Rezende']);
    expect(res.items[1]?.specialties.map((s) => s.name)).toEqual(['Cirurgia', 'Radiologia']);
    expect(res.items[0]?.specialties).toEqual([]);
    expect(Object.keys(res.items[0] ?? {})).not.toContain('new');
  });

  it('T008: percorrer as páginas mostra cada veterinário uma vez; página fora da faixa leva à primeira', async () => {
    for (let i = 0; i < 12; i++) await vet(`Vet${i}`, `Sobrenome${String(i).padStart(2, '0')}`);
    const seen: number[] = [];
    for (const page of [1, 2, 3])
      seen.push(
        ...(await t.api.get(`/api/vets?page=${page}&pageSize=5`).expect(200)).body.items.map(
          (v: { id: number }) => v.id,
        ),
      );
    expect(new Set(seen).size).toBe(12);
    expect((await t.api.get('/api/vets?page=99&pageSize=5').expect(200)).body.page).toBe(1);
  });

  it('T013: pedido de outro formato é recusado com 406, sem resposta malformada', async () => {
    const res = await t.api.get('/api/vets').set('Accept', 'application/xml').expect(406);
    expect(res.body).toEqual({ error: { code: 'unsupported_format' } });
  });
});
