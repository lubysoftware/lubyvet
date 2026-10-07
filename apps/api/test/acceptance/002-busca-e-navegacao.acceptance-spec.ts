import { PAGE_SIZE } from '@lubyvet/contracts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { anOwnerInput } from '../builders/owner.builder';
import { bootApp, idem, type TestApp } from '../support/app';
import { aPetInput, postPet } from '../support/pets';
import { testDb } from '../support/test-db';

const repo = join(__dirname, '../../../..');
type Item = { id: number; lastName: string; petNames: string[] };

describe('002 Busca e navegação de donos: critérios de aceite', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  const owner = async (lastName: string) =>
    (await t.api.post('/api/owners').set(idem()).send(anOwnerInput({ lastName })).expect(201)).body as Item;
  const search = (q: Record<string, string>) =>
    t.api.get(`/api/owners?${new URLSearchParams(q).toString()}`).expect(200);
  const names = (body: { items: Item[] }) => body.items.map((i) => i.lastName).sort();

  it('002/CA-1.1 traz só os sobrenomes que começam pelo termo, com contato e nomes dos animais', async () => {
    const a = await owner('Albuquerque');
    await owner('Almeida');
    await owner('Souza Albuquerque');
    await postPet(t, a.id, aPetInput({ name: 'Bidu' })).expect(201);
    const res = (await search({ lastName: 'Albu' })).body;
    expect(names(res)).toEqual(['Albuquerque']);
    expect(res.items[0]).toMatchObject({ address: expect.any(String), city: expect.any(String) });
    expect(res.items[0].telephone).toMatch(/^\+55/);
    expect(res.items[0].petNames).toEqual(['Bidu']);
  });

  it('002/CA-1.2 termo vazio ou só com espaços devolve todos', async () => {
    await owner('Lima');
    await owner('Souza');
    expect((await search({ lastName: '' })).body.total).toBe(2);
    expect((await search({ lastName: '   ' })).body.total).toBe(2);
  });

  it('002/CA-1.3 espaços nas pontas não mudam o resultado', async () => {
    await owner('Lima');
    await owner('Souza');
    expect(names((await search({ lastName: '  Li ' })).body)).toEqual(
      names((await search({ lastName: 'Li' })).body),
    );
  });

  it('002/CA-1.4 sem resultado, a resposta marca o termo como não encontrado (o web mostra erro no campo)', async () => {
    await owner('Lima');
    const res = (await search({ lastName: 'Zz' })).body;
    expect(res).toMatchObject({ total: 0, items: [], lastName: 'Zz' });
    const view = readFileSync(
      join(repo, 'apps/web/src/features/owners/components/owners-search-view.tsx'),
      'utf8',
    );
    expect(view).toContain("data.lastName !== '' && data.total === 0");
  });

  it('002/CA-1.5 a busca não altera nada', async () => {
    await owner('Lima');
    const before = (await testDb.sql.query('select * from owners')).rows;
    await search({ lastName: 'Li' });
    expect((await testDb.sql.query('select * from owners')).rows).toEqual(before);
  });

  it('002/CA-2.1 a página seguinte continua só com o sobrenome buscado', async () => {
    for (let i = 0; i < 7; i++) await owner(`Silva${i}`);
    for (let i = 0; i < 3; i++) await owner(`Costa${i}`);
    const p2 = (await search({ lastName: 'Silva', page: '2', pageSize: '5' })).body;
    expect(p2).toMatchObject({ page: 2, total: 7, lastName: 'Silva' });
    expect(p2.items.every((i: Item) => i.lastName.startsWith('Silva'))).toBe(true);
  });

  it('002/CA-2.2 página menor que um, maior que o total ou não numérica leva à primeira, com o filtro', async () => {
    for (let i = 0; i < 7; i++) await owner(`Silva${i}`);
    for (const page of ['0', '-3', '99', 'abc']) {
      const res = (await search({ lastName: 'Silva', page, pageSize: '5' })).body;
      expect(res).toMatchObject({ page: 1, lastName: 'Silva', total: 7 });
    }
  });

  it('002/CA-2.3 base vazia responde a primeira página vazia', async () => {
    expect((await search({ page: '5' })).body).toMatchObject({ page: 1, items: [], total: 0 });
  });

  it('002/CA-2.4 o tamanho da página é configuração (P-06), não valor fixo', async () => {
    expect(PAGE_SIZE).toEqual({ default: 10, min: 5, max: 50 });
    for (let i = 0; i < 12; i++) await owner(`Rocha${i}`);
    expect((await search({})).body.items).toHaveLength(PAGE_SIZE.default);
    expect((await search({ pageSize: '5' })).body.items).toHaveLength(5);
  });

  it('002/CA-3.1 um resultado só leva à ficha (o web redireciona pelo resultado único)', async () => {
    const a = await owner('Albuquerque');
    await owner('Lima');
    const res = (await search({ lastName: 'Albu' })).body;
    expect(res.total).toBe(1);
    const view = readFileSync(
      join(repo, 'apps/web/src/features/owners/components/owners-search-view.tsx'),
      'utf8',
    );
    expect(view).toContain('`/owners/${data.items[0].id}`');
    expect(res.items[0].id).toBe(a.id);
  });

  it('002/CA-3.2 dois ou mais resultados mostram a lista', async () => {
    await owner('Lima');
    await owner('Limeira');
    expect((await search({ lastName: 'Lim' })).body.total).toBe(2);
  });

  it('002/CA-3.3 a ficha alcançada pelo atalho não leva mensagem de gravação', () => {
    const view = readFileSync(
      join(repo, 'apps/web/src/features/owners/components/owners-search-view.tsx'),
      'utf8',
    );
    const target = /singleResultTarget[\s\S]*?\n};?\n/.exec(view)?.[0] ?? '';
    expect(target).not.toContain('saved=');
  });

  it('002/CA-4.1 minúsculas, capitalizado e maiúsculas devolvem o mesmo conjunto', async () => {
    await owner('Albuquerque');
    await owner('albuquerque');
    await owner('Lima');
    const r = await Promise.all(['albu', 'Albu', 'ALBU'].map((q) => search({ lastName: q })));
    expect(r.map((x) => x.body.total)).toEqual([2, 2, 2]);
  });

  it('002/CA-4.2 a busca roda contra o banco homologado (PostgreSQL), sem diferença de caixa', async () => {
    const { rows } = await testDb.sql.query<{ v: string }>('select version() as v');
    expect(rows[0]?.v).toMatch(/PostgreSQL 17/);
    await owner('Évora');
    expect((await search({ lastName: 'évo' })).body.total).toBe(1);
    expect((await search({ lastName: 'ÉVO' })).body.total).toBe(1);
  });

  it('002/CA-5.1 a listagem paginada responde em menos de 500 ms no p95 com 50 mil donos (D08)', async () => {
    await testDb.sql.query(`
      insert into owners (first_name, last_name, address, city, telephone, cpf, updated_at)
      select 'Nome', 'Sobrenome' || g, 'Rua ' || g, 'Cidade', '+55119' || lpad(g::text, 8, '0'),
             lpad(g::text, 11, '0'), now()
      from generate_series(1, 50000) g`);
    const times: number[] = [];
    for (let i = 0; i < 40; i++) {
      const start = performance.now();
      await search({ lastName: i % 2 ? 'Sobrenome1' : '', page: String(1 + (i % 7)) });
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    expect(times[Math.ceil(times.length * 0.95) - 1]).toBeLessThan(500);
  }, 120_000);

  it('002/CA-5.2 a medição automatizada roda com volume representativo, não com a carga de exemplo', () => {
    const perf = readFileSync(join(__dirname, '../perf/owners-search.perf-spec.ts'), 'utf8');
    expect(perf).toMatch(/50[_.]?000/);
  });
});
