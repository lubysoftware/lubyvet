import { OwnerSearchOutput } from '@lubyvet/contracts';
import { anOwnerInput } from '../builders/owner.builder';
import { bootApp, idem, type TestApp } from '../support/app';
import { testDb } from '../support/test-db';

// 002: T011 (busca), T012 (paginação e guarda de faixa), T014 (caixa), T015 (PostgreSQL real).
describe('GET /api/owners', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });
  const add = (lastName: string, firstName = 'Ana') =>
    t.api.post('/api/owners').set(idem()).send(anOwnerInput({ lastName, firstName })).expect(201);
  const search = (q: string) => t.api.get(`/api/owners?${q}`).expect(200);

  it('T011: encontra pelo começo do sobrenome, no formato do contrato', async () => {
    await add('Davis');
    await add('Davidson');
    await add('Franklin');
    const res = await search('lastName=Dav');
    expect(OwnerSearchOutput.parse(res.body).items.map((o) => o.lastName)).toEqual(['Davidson', 'Davis']);
  });

  it('T011: termo vazio lista todos; termo sem resultado devolve lista vazia', async () => {
    await add('Davis');
    expect((await search('lastName=')).body.total).toBe(1);
    expect((await search('lastName=Zz')).body).toMatchObject({ items: [], total: 0, page: 1 });
  });

  it('T011: o termo volta normalizado para os links e curinga é tratado como texto', async () => {
    await add('Da Silva');
    expect((await search('lastName=%20%20da%20%20Silva%20')).body).toMatchObject({
      lastName: 'da Silva',
      total: 1,
    });
    expect((await search('lastName=%25')).body.total).toBe(0);
  });

  it('T014/T015: maiúsculas e minúsculas não importam, no PostgreSQL real', async () => {
    await add('Davis');
    for (const q of ['davis', 'DAVIS', 'dAv']) expect((await search(`lastName=${q}`)).body.total).toBe(1);
  });

  it('T012: tamanho de página da P-06 (10 por padrão, de 5 a 50) e o sexto dono na segunda página', async () => {
    for (let i = 0; i < 6; i++) await add('Lima', `Dono${i}`);
    expect((await search('lastName=Lima')).body).toMatchObject({ pageSize: 10, total: 6 });
    const p2 = await search('lastName=Lima&page=2&pageSize=5');
    expect(p2.body.items).toHaveLength(1);
    expect(p2.body.items[0].firstName).toBe('Dono5');
    await t.api.get('/api/owners?pageSize=4').expect(422);
    await t.api.get('/api/owners?pageSize=51').expect(422);
  });

  it('T012: página fora da faixa vira a última; base vazia tem uma página', async () => {
    for (let i = 0; i < 6; i++) await add('Lima', `Dono${i}`);
    expect((await search('lastName=Lima&page=99&pageSize=5')).body.page).toBe(2);
    expect((await search('lastName=Nada&page=3')).body.page).toBe(1);
  });

  it('T007: navegar entre páginas mantém o filtro', async () => {
    for (let i = 0; i < 6; i++) await add('Lima', `Dono${i}`);
    await add('Souza');
    const p1 = await search('lastName=Lima&page=1&pageSize=5');
    const p2 = await search(`lastName=${encodeURIComponent(p1.body.lastName)}&page=2&pageSize=5`);
    expect(
      [...p1.body.items, ...p2.body.items].every((o: { lastName: string }) => o.lastName === 'Lima'),
    ).toBe(true);
    expect(p1.body.items.length + p2.body.items.length).toBe(6);
  });

  it('a listagem traz os nomes dos animais do dono', async () => {
    const o = (await add('Davis')).body;
    await t.api
      .post(`/api/owners/${o.id}/pets`)
      .set(idem())
      .send({ name: 'Thor', birthDate: '2020-01-01', speciesId: 2 })
      .expect(201);
    expect((await search('lastName=Davis')).body.items[0].petNames).toEqual(['Thor']);
  });
});
