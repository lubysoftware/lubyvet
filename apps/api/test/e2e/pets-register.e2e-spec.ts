import { PetOutput } from '@lubyvet/contracts';
import { anOwnerInput } from '../builders/owner.builder';
import { bootApp, idem, type TestApp } from '../support/app';
import { SPECIES, testDb } from '../support/test-db';

describe('POST /api/owners/:ownerId/pets (003/US-1)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });
  const owner = async () =>
    (await t.api.post('/api/owners').set(idem()).send(anOwnerInput()).expect(201)).body;

  it('cadastra o animal do dono no formato do contrato', async () => {
    const o = await owner();
    const res = await t.api
      .post(`/api/owners/${o.id}/pets`)
      .set(idem())
      .send({ name: 'Thor', birthDate: '2020-05-01', speciesId: SPECIES.dog })
      .expect(201);
    expect(PetOutput.strict().parse(res.body)).toMatchObject({
      ownerId: o.id,
      name: 'Thor',
      species: { id: SPECIES.dog, name: 'Cão' },
    });
  });

  it('nomes que diferem só pela caixa são o mesmo nome, no mesmo dono, mesmo em paralelo (T008, T009)', async () => {
    const o = await owner();
    const send = (name: string) =>
      t.api
        .post(`/api/owners/${o.id}/pets`)
        .set(idem())
        .send({ name, birthDate: '2020-05-01', speciesId: SPECIES.dog });
    const results = await Promise.all([send('Rex'), send('rex'), send('REX')]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 422, 422]);
    for (const r of results.filter((x) => x.status === 422))
      expect(r.body.error.fields).toEqual([{ path: 'name', code: 'pet_name_taken' }]);
  });

  it('lista as seis espécies do vocabulário', async () => {
    const res = await t.api.get('/api/species').expect(200);
    expect(res.body).toHaveLength(6);
  });
});
