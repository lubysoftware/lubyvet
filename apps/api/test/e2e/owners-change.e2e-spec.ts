import request from 'supertest';
import { anOwnerInput } from '../builders/owner.builder';
import { bootApp, type TestApp } from '../support/app';
import { testDb } from '../support/test-db';

// 001/T010: abrir a edição com os valores atuais e gravar a alteração (US-4).
describe('PATCH /api/owners/:ownerId', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });
  const create = async () =>
    (
      await request(t.http)
        .post('/api/owners')
        .send(anOwnerInput({ city: 'São Paulo' }))
        .expect(201)
    ).body;

  it('UT-004-1: a edição abre com os dados atuais (a mesma leitura da ficha)', async () => {
    const owner = await create();
    expect((await request(t.http).get(`/api/owners/${owner.id}`).expect(200)).body).toEqual(owner);
  });

  it('UT-004-2: grava os dados novos, mantém o identificador e termina na ficha', async () => {
    const owner = await create();
    const res = await request(t.http)
      .patch(`/api/owners/${owner.id}`)
      .send({ version: owner.version, city: 'Campinas' })
      .expect(200);
    expect(res.body).toMatchObject({
      id: owner.id,
      city: 'Campinas',
      firstName: owner.firstName,
      version: owner.version + 1,
    });
  });

  it('UT-004-3: as validações do cadastro valem na edição e nada é gravado', async () => {
    const owner = await create();
    const res = await request(t.http)
      .patch(`/api/owners/${owner.id}`)
      .send({ version: owner.version, city: '', lastName: 'x'.repeat(31) })
      .expect(422);
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        { path: 'city', code: 'required' },
        { path: 'lastName', code: 'too_long' },
      ]),
    );
    expect((await request(t.http).get(`/api/owners/${owner.id}`)).body.city).toBe('São Paulo');
  });

  it('REG-05: corpo que nomeia outro dono é recusado', async () => {
    const owner = await create();
    const res = await request(t.http)
      .patch(`/api/owners/${owner.id}`)
      .send({ id: owner.id + 1, version: owner.version })
      .expect(422);
    expect(res.body.error.fields).toEqual([{ path: 'id', code: 'id_mismatch' }]);
  });

  it('dono inexistente responde 404', async () => {
    await request(t.http).patch('/api/owners/999').send({ version: 0 }).expect(404);
  });
});
