import request from 'supertest';
import { bootApp, idem, type TestApp } from '../support/app';
import { anOwner, aPetInput, patchPet, postPet } from '../support/pets';
import { SPECIES, testDb } from '../support/test-db';

// 009: T007 (espécies), T009 (par veterinário e especialidade), T010 (quadro de veterinários).
describe('administração de vocabulários', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });
  const post = (url: string, body: object) => request(t.http).post(url).set(idem()).send(body);
  const patch = (url: string, body: object) => request(t.http).patch(url).set(idem()).send(body);

  it('T007: inclui espécie e recusa repetida com outra caixa', async () => {
    await post('/api/admin/species', { name: 'Coelho' }).expect(201);
    expect((await post('/api/admin/species', { name: 'coelho' }).expect(422)).body.error.fields).toEqual([
      { path: 'name', code: 'species_name_taken' },
    ]);
  });

  it('T007: renomear mantém os animais vinculados; inativar tira da oferta sem apagar', async () => {
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput({ speciesId: SPECIES.dog })).expect(201)).body;
    const renamed = (
      await patch(`/api/admin/species/${SPECIES.dog}`, { version: 0, name: 'Cachorro' }).expect(200)
    ).body;
    expect((await request(t.http).get(`/api/owners/${o.id}/pets/${p.id}`)).body.species.name).toBe(
      'Cachorro',
    );
    expect(renamed.petsCount).toBe(1);
    await patch(`/api/admin/species/${SPECIES.dog}`, { version: renamed.version, status: 'inactive' }).expect(
      200,
    );
    expect(
      (await request(t.http).get('/api/species')).body.map((s: { name: string }) => s.name),
    ).not.toContain('Cachorro');
    expect(
      (await postPet(t, o.id, aPetInput({ name: 'Rex', speciesId: SPECIES.dog })).expect(422)).body.error
        .fields,
    ).toEqual([{ path: 'speciesId', code: 'species_inactive' }]);
    expect(
      (await patchPet(t, o.id, p.id, { version: p.version, speciesId: SPECIES.dog }).expect(422)).body.error
        .fields,
    ).toEqual([{ path: 'speciesId', code: 'species_inactive' }]);
    expect(await testDb.count('species')).toBe(6);
  });

  it('T010: inclui veterinário, desliga e reativa; o catálogo acompanha sem reiniciar (CA-3.1)', async () => {
    const vet = (
      await post('/api/admin/vets', { firstName: 'Paula', lastName: 'Rezende', specialtyIds: [1] }).expect(
        201,
      )
    ).body;
    expect((await request(t.http).get('/api/vets')).body.total).toBe(1);
    const off = (
      await patch(`/api/admin/vets/${vet.id}`, { version: vet.version, status: 'dismissed' }).expect(200)
    ).body;
    expect((await request(t.http).get('/api/vets')).body.total).toBe(0);
    await patch(`/api/admin/vets/${vet.id}`, { version: off.version, status: 'active' }).expect(200);
    expect((await request(t.http).get('/api/vets')).body.total).toBe(1);
    expect(
      (await post('/api/admin/vets', { firstName: '', lastName: 'x'.repeat(31) }).expect(422)).body.error
        .fields,
    ).toHaveLength(2);
  });

  it('T009: vincular de novo a mesma especialidade é recusado pela restrição', async () => {
    const vet = (
      await post('/api/admin/vets', { firstName: 'Paula', lastName: 'Rezende', specialtyIds: [1] }).expect(
        201,
      )
    ).body;
    expect(
      (await patch(`/api/admin/vets/${vet.id}`, { version: vet.version, addSpecialtyId: 1 }).expect(422)).body
        .error.fields,
    ).toEqual([{ path: 'addSpecialtyId', code: 'specialty_already_linked' }]);
    const ok = (
      await patch(`/api/admin/vets/${vet.id}`, { version: vet.version, addSpecialtyId: 2 }).expect(200)
    ).body;
    expect(ok.specialtyIds).toEqual([1, 2]);
  });
});
