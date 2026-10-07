import request from 'supertest';
import { bootApp, type TestApp } from '../support/app';
import { testDb } from '../support/test-db';

const VOLUME = 50_000;
const SAMPLES = 200;
const P95_LIMIT_MS = 500;

/** Massa sintética (nunca dado real): sobrenomes de uma lista fixa com sufixo numérico. */
async function seedOwners(n: number): Promise<void> {
  await testDb.sql.query(
    `insert into owners (first_name, last_name, address, city, telephone, cpf, updated_at)
     select 'Dono' || g,
            (array['Silva','Santos','Oliveira','Souza','Lima','Pereira','Costa','Almeida','Nogueira','Teixeira'])[1 + g % 10] || g,
            'Rua Sintética, ' || g, 'Cidade ' || (g % 50),
            '+55119' || lpad((10000000 + g)::text, 8, '0'), lpad(g::text, 11, '0'), now()
     from generate_series(1, $1) g`,
    [n],
  );
}

const p95 = (xs: number[]): number =>
  [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * 0.95) - 1] ?? Infinity;

// 002/T016, D08: busca e listagem com p95 < 500 ms sobre 50 mil donos.
describe('desempenho da busca de donos (D08)', () => {
  let t: TestApp;
  beforeAll(async () => {
    await testDb.truncate();
    await seedOwners(VOLUME);
    await testDb.sql.query('analyze owners');
    t = await bootApp();
  }, 120_000);
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  it(`p95 abaixo de ${P95_LIMIT_MS} ms em busca e em listagem paginada`, async () => {
    const terms = ['Sil', 'santos1', 'LIMA', '', 'Teixeira49', 'Cos'];
    const times: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      const term = terms[i % terms.length] ?? '';
      const page = 1 + (i % 7);
      const start = performance.now();
      await request(t.http).get(`/api/owners?lastName=${term}&page=${page}&pageSize=10`).expect(200);
      times.push(performance.now() - start);
    }
    expect(p95(times)).toBeLessThan(P95_LIMIT_MS);
  }, 300_000);
});
