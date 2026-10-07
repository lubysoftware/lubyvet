import { bootApp, idem, type TestApp } from '../support/app';
import { anOwner, aPetInput, postPet } from '../support/pets';
import { testDb } from '../support/test-db';

// 004/T021, D01: veterinário opcional no atendimento e a consulta por veterinário.
describe('veterinário no atendimento', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp('2026-10-07T12:00:00-03:00');
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  it('UT-021-2/3/4: grava com e sem veterinário, recusa inexistente e lista os animais atendidos', async () => {
    const { rows } = await testDb.sql.query<{ id: number }>(
      "insert into vets (first_name, last_name, updated_at) values ('Paula', 'Rezende', now()) returning id",
    );
    const vetId = rows[0]?.id ?? 0;
    const o = await anOwner(t);
    const thor = (await postPet(t, o.id, aPetInput({ name: 'Thor' })).expect(201)).body;
    const mel = (await postPet(t, o.id, aPetInput({ name: 'Mel' })).expect(201)).body;
    const enc = (petId: number, body: object) =>
      t.api
        .post(`/api/owners/${o.id}/pets/${petId}/encounters`)
        .set(idem())
        .send({ date: '2026-10-07', chiefComplaint: 'Tosse', ...body });
    expect((await enc(thor.id, { vetId }).expect(201)).body.vetId).toBe(vetId);
    await enc(thor.id, { vetId }).expect(201);
    expect((await enc(mel.id, {}).expect(201)).body.vetId).toBeNull();
    expect((await enc(mel.id, { vetId: 999 }).expect(422)).body.error.fields).toEqual([
      { path: 'vetId', code: 'vet_inactive' },
    ]);
    expect((await t.api.get(`/api/vets/${vetId}/patients`).expect(200)).body).toEqual([
      { petId: thor.id, petName: 'Thor', ownerId: o.id, encounters: 2 },
    ]);
  });
});
