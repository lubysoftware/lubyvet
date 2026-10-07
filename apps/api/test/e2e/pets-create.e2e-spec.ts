import { bootApp, type TestApp } from '../support/app';
import { anOwner, aPetInput, postPet } from '../support/pets';
import { SPECIES, testDb } from '../support/test-db';

// 003/T012: UT-013-1 a UT-013-8 pela rota até o banco.
describe('cadastro de animal', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  it('UT-013-1: caminho feliz grava o animal do dono', async () => {
    const o = await anOwner(t);
    await postPet(t, o.id, aPetInput()).expect(201);
    expect(await testDb.count('pets', { owner_id: o.id })).toBe(1);
  });

  it.each([
    ['name', 'required'],
    ['birthDate', 'required'],
    ['speciesId', 'species_required'],
  ])('UT-013-2: %s ausente é recusado no campo', async (field, code) => {
    const o = await anOwner(t);
    const body = Object.fromEntries(Object.entries(aPetInput()).filter(([k]) => k !== field));
    const res = await postPet(t, o.id, body).expect(422);
    expect(res.body.error.fields).toEqual([{ path: field, code }]);
  });

  it('UT-013-3: nome em branco é recusado', async () => {
    const res = await postPet(t, (await anOwner(t)).id, aPetInput({ name: '  ' })).expect(422);
    expect(res.body.error.fields).toEqual([{ path: 'name', code: 'required' }]);
  });

  it('UT-013-4: data de amanhã é recusada no campo de data', async () => {
    const res = await postPet(t, (await anOwner(t)).id, aPetInput({ birthDate: '2026-10-08' })).expect(422);
    expect(res.body.error.fields).toEqual([{ path: 'birthDate', code: 'date_in_future' }]);
  });

  it('UT-013-5: espécie fora do vocabulário é recusada no campo de espécie', async () => {
    const res = await postPet(t, (await anOwner(t)).id, aPetInput({ speciesId: 7 })).expect(422);
    expect(res.body.error.fields).toEqual([{ path: 'speciesId', code: 'unknown_species' }]);
  });

  it('UT-013-6: o animal tem exatamente um dono e uma espécie', async () => {
    const o = await anOwner(t);
    const res = await postPet(t, o.id, aPetInput({ speciesId: SPECIES.cat })).expect(201);
    expect(res.body).toMatchObject({ ownerId: o.id, species: { id: SPECIES.cat, name: 'Gato' } });
  });

  it('UT-013-7: nome de 30 caracteres é aceito e o de 31 recusado', async () => {
    const o = await anOwner(t);
    await postPet(t, o.id, aPetInput({ name: 'a'.repeat(30) })).expect(201);
    const res = await postPet(t, o.id, aPetInput({ name: 'b'.repeat(31) })).expect(422);
    expect(res.body.error.fields).toEqual([{ path: 'name', code: 'too_long' }]);
  });

  it('UT-013-8: data em formato diferente vira erro de campo, nunca falha de conversão', async () => {
    const o = await anOwner(t);
    for (const birthDate of ['01/05/2020', '2020-13-40', 'ontem']) {
      const res = await postPet(t, o.id, aPetInput({ birthDate })).expect(422);
      expect(res.body.error.fields).toEqual([{ path: 'birthDate', code: 'invalid_format' }]);
    }
  });

  it('dono inexistente responde 404', async () => {
    await postPet(t, 999, aPetInput()).expect(404);
  });
});
