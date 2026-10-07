import { bootApp, type TestApp } from '../support/app';
import { anOwner, aPetInput, patchPet, postPet } from '../support/pets';
import { testDb } from '../support/test-db';

// 003/T017: espécie obrigatória pela REQUISIÇÃO montada, não pelo formulário (Pergunta 5, arbitragem de C1).
describe('espécie obrigatória, também na edição', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });
  const pet = async () => {
    const o = await anOwner(t);
    return { o, p: (await postPet(t, o.id, aPetInput()).expect(201)).body };
  };

  it('UT-016-1: edição com espécie vazia é recusada no campo de espécie', async () => {
    const { o, p } = await pet();
    const res = await patchPet(t, o.id, p.id, { version: p.version, speciesId: null }).expect(422);
    expect(res.body.error.fields).toEqual([{ path: 'speciesId', code: 'species_required' }]);
  });

  it('UT-016-2: nenhuma gravação chega ao banco', async () => {
    const { o, p } = await pet();
    await patchPet(t, o.id, p.id, { version: p.version, speciesId: null, name: 'Rex' }).expect(422);
    const { rows } = await testDb.sql.query<{ name: string; version: number }>(
      'select name, version from pets where id = $1',
      [p.id],
    );
    expect(rows[0]).toEqual({ name: 'Thor', version: 0 });
  });

  it('UT-016-3: a mesma declaração produz o mesmo erro na criação e na edição', async () => {
    const { o, p } = await pet();
    const create = await postPet(t, o.id, aPetInput({ name: 'Mel', speciesId: null })).expect(422);
    const change = await patchPet(t, o.id, p.id, { version: p.version, speciesId: null }).expect(422);
    expect(create.body.error.fields).toEqual(change.body.error.fields);
  });

  it.each([0, -1, 'cao'])(
    'UT-016-4: valor %p de espécie não grava e não vira erro 500',
    async (speciesId) => {
      const { o, p } = await pet();
      const res = await patchPet(t, o.id, p.id, { version: p.version, speciesId });
      expect(res.status).toBe(422);
    },
  );

  it('UT-016-5: editar outro campo de um animal já gravado não exige reenviar a espécie', async () => {
    const { o, p } = await pet();
    await patchPet(t, o.id, p.id, { version: p.version, name: 'Rex' }).expect(200);
  });
});
