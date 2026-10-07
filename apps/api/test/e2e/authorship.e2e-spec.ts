import request from 'supertest';
import { anOwnerInput } from '../builders/owner.builder';
import { bootApp, idem, loginAs, type TestApp } from '../support/app';
import { testDb } from '../support/test-db';

// 007: T016 (nenhuma escrita anônima; autoria imutável pelos caminhos normais) e T018 (autoria consultável).
describe('autoria por pessoa (D02)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  it('UT-036-1/4: quem cria e quem altera fica registrado, e a ficha mostra para qualquer papel', async () => {
    const o = (await t.api.post('/api/owners').set(idem()).send(anOwnerInput()).expect(201)).body;
    const writer = await loginAs(t.http, 'writer');
    await request(t.http)
      .patch(`/api/owners/${o.id}`)
      .set('Cookie', writer)
      .set(idem())
      .send({ version: o.version, city: 'Campinas' })
      .expect(200);
    const reader = await loginAs(t.http, 'reader');
    const a = (await request(t.http).get(`/api/owners/${o.id}/authorship`).set('Cookie', reader).expect(200))
      .body;
    expect([a.createdBy, a.updatedBy]).toEqual([
      { id: 1, name: 'Ana Admin' },
      { id: 2, name: 'Carla Escrita' },
    ]);
  });

  it('UT-036-2/5: autoria vinda no corpo é ignorada, e animal e visita também registram quem gravou', async () => {
    const o = (
      await t.api
        .post('/api/owners')
        .set(idem())
        .send({ ...anOwnerInput(), createdBy: 3, updatedBy: 3 })
        .expect(201)
    ).body;
    const p = (
      await t.api
        .post(`/api/owners/${o.id}/pets`)
        .set(idem())
        .send({ name: 'Thor', birthDate: '2020-01-01', speciesId: 2, createdBy: 3 })
        .expect(201)
    ).body;
    const { rows } = await testDb.sql.query<{ o: number; p: number }>(
      'select o.created_by as o, p.created_by as p from owners o join pets p on p.owner_id = o.id where p.id = $1',
      [p.id],
    );
    expect(rows[0]).toEqual({ o: 1, p: 1 });
  });

  it('T016: nenhuma escrita sem sessão chega ao banco', async () => {
    await request(t.http).post('/api/owners').set(idem()).send(anOwnerInput()).expect(401);
    expect(await testDb.count('owners')).toBe(0);
  });
});
