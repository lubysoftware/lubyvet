import { bootApp, type TestApp } from '../support/app';
import { anOwner, aPetInput, patchPet, postPet } from '../support/pets';
import { testDb } from '../support/test-db';

// 003/T020, CA-3.5, D09: situação do animal.
describe('situação do animal', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  it('nasce Ativo; Ativo vai para Falecido e continua na ficha e na unicidade de nome', async () => {
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput({ name: 'Mel' })).expect(201)).body;
    expect(p.status).toBe('active');
    const dead = await patchPet(t, o.id, p.id, { version: p.version, status: 'deceased' }).expect(200);
    expect(dead.body.status).toBe('deceased');
    expect((await postPet(t, o.id, aPetInput({ name: 'mel' })).expect(422)).body.error.fields).toEqual([
      { path: 'name', code: 'pet_name_taken' },
    ]);
  });

  it('Falecido não vira Transferido, e a volta para Ativo exige Administrador', async () => {
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput()).expect(201)).body;
    const dead = (await patchPet(t, o.id, p.id, { version: p.version, status: 'deceased' }).expect(200)).body;
    expect(
      (await patchPet(t, o.id, p.id, { version: dead.version, status: 'transferred' }).expect(422)).body.error
        .code,
    ).toBe('invalid_transition');
    expect(
      (await patchPet(t, o.id, p.id, { version: dead.version, status: 'active' }).expect(403)).body.error
        .code,
    ).toBe('forbidden');
  });

  it('situação fora da lista é erro de campo', async () => {
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput()).expect(201)).body;
    expect(
      (await patchPet(t, o.id, p.id, { version: p.version, status: 'lost' }).expect(422)).body.error.fields,
    ).toEqual([{ path: 'status', code: 'invalid_format' }]);
  });
});
