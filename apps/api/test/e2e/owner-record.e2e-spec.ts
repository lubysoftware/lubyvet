import { OwnerRecordOutput } from '@lubyvet/contracts';
import { bootApp, idem, type TestApp } from '../support/app';
import { anOwner, aPetInput, patchPet, postPet } from '../support/pets';
import { testDb } from '../support/test-db';

describe('ficha do dono (001/T013) e alteração de animal com visitas intactas (003/T016)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp('2026-10-07T12:00:00-03:00');
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });
  const schedule = (url: string, scheduledAt: string, description = 'Consulta') =>
    t.api.post(`${url}/appointments`).set(idem()).send({ scheduledAt, description }).expect(201);

  it('UT-006: animais em ordem alfabética, visitas em ordem crescente e estável, paginadas; nada é gravado', async () => {
    const o = await anOwner(t);
    const thor = (await postPet(t, o.id, aPetInput({ name: 'Thor' })).expect(201)).body;
    await postPet(t, o.id, aPetInput({ name: 'amora' })).expect(201);
    const url = `/api/owners/${o.id}/pets/${thor.id}`;
    await schedule(url, '2026-10-20T09:00:00-03:00', 'C');
    await schedule(url, '2026-10-10T09:00:00-03:00', 'A');
    await schedule(url, '2026-10-10T09:00:00-03:00', 'B');
    const before = await testDb.count('appointments');
    const r = OwnerRecordOutput.parse(
      (await t.api.get(`/api/owners/${o.id}/record?visitsPage=1&visitsPageSize=5`).expect(200)).body,
    );
    expect(r.pets.map((p) => p.name)).toEqual(['amora', 'Thor']);
    expect(r.pets[1]?.visits.items.map((v) => v.description)).toEqual(['A', 'B', 'C']);
    expect(r.pets[1]?.visits.total).toBe(3);
    expect(await testDb.count('appointments')).toBe(before);
    await t.api.get('/api/owners/999/record').expect(404);
  });

  it('UT-015: alterar nome e nascimento mantém o identificador e as visitas, em número e conteúdo', async () => {
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput()).expect(201)).body;
    const url = `/api/owners/${o.id}/pets/${p.id}`;
    for (const d of ['2026-10-10', '2026-10-11', '2026-10-12']) await schedule(url, `${d}T09:00:00-03:00`);
    const before = (await t.api.get(`${url}/visits`)).body;
    const changed = (
      await patchPet(t, o.id, p.id, {
        version: p.version,
        name: 'a'.repeat(30),
        birthDate: '2019-02-02',
      }).expect(200)
    ).body;
    expect(changed.id).toBe(p.id);
    expect((await t.api.get(`${url}/visits`)).body).toEqual(before);
    expect(
      (await patchPet(t, o.id, p.id, { version: changed.version, name: 'b'.repeat(31) }).expect(422)).body
        .error.fields,
    ).toEqual([{ path: 'name', code: 'too_long' }]);
  });
});
