import { bootApp, idem, type TestApp } from '../support/app';
import { anOwner, aPetInput, patchPet, postPet } from '../support/pets';
import { testDb } from '../support/test-db';

// 004: T008, T011, T013, T016, T019 pela rota até o banco. Relógio fixo em 07/10/2026 12:00.
describe('regras da agenda', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp('2026-10-07T12:00:00-03:00');
  });
  beforeEach(async () => {
    t.clock.set('2026-10-07T12:00:00-03:00');
    await testDb.truncate();
  });
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });
  const setup = async () => {
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput()).expect(201)).body;
    return { o, p, url: `/api/owners/${o.id}/pets/${p.id}` };
  };
  const schedule = (url: string, scheduledAt: string, description = 'Vacina') =>
    t.api.post(`${url}/appointments`).set(idem()).send({ scheduledAt, description });

  it('T008: agenda no futuro e recusa descrição vazia, longa demais e data ausente', async () => {
    const { url } = await setup();
    await schedule(url, '2026-10-08T09:00:00-03:00').expect(201);
    expect((await schedule(url, '2026-10-08T09:00:00-03:00', '').expect(422)).body.error.fields).toEqual([
      { path: 'description', code: 'required' },
    ]);
    expect(
      (await schedule(url, '2026-10-08T09:00:00-03:00', 'a'.repeat(256)).expect(422)).body.error.fields,
    ).toEqual([{ path: 'description', code: 'too_long' }]);
    expect(
      (await t.api.post(`${url}/appointments`).set(idem()).send({ description: 'x' }).expect(422)).body.error
        .fields,
    ).toEqual([{ path: 'scheduledAt', code: 'required' }]);
  });

  it('T008/D09: animal falecido não aceita agendamento novo', async () => {
    const { o, p, url } = await setup();
    await patchPet(t, o.id, p.id, { version: p.version, status: 'deceased' }).expect(200);
    expect((await schedule(url, '2026-10-08T09:00:00-03:00').expect(422)).body.error.fields).toEqual([
      { path: 'petId', code: 'pet_not_schedulable' },
    ]);
  });

  it('T013: agendamento recusa agora e o passado; atendimento aceita hoje e o passado e recusa amanhã (D06)', async () => {
    const { url } = await setup();
    expect((await schedule(url, '2026-10-07T12:00:00-03:00').expect(422)).body.error.fields).toEqual([
      { path: 'scheduledAt', code: 'date_in_past' },
    ]);
    const enc = (date: string) =>
      t.api.post(`${url}/encounters`).set(idem()).send({ date, chiefComplaint: 'Tosse' });
    await enc('2026-10-07').expect(201);
    await enc('2019-03-01').expect(201);
    expect((await enc('2026-10-08').expect(422)).body.error.fields).toEqual([
      { path: 'date', code: 'date_in_future' },
    ]);
  });

  it('T011: o histórico do animal vem em ordem crescente de data, com cada mudança datada', async () => {
    const { url } = await setup();
    await schedule(url, '2026-10-20T09:00:00-03:00', 'Segunda').expect(201);
    await schedule(url, '2026-10-09T09:00:00-03:00', 'Primeira').expect(201);
    const visits = (await t.api.get(`${url}/visits`).expect(200)).body;
    expect(visits.appointments.map((a: { description: string }) => a.description)).toEqual([
      'Primeira',
      'Segunda',
    ]);
    expect(visits.appointments[0].history).toEqual([
      { from: null, to: 'scheduled', at: '2026-10-07T15:00:00.000Z' },
    ]);
  });

  it('T016: Realizada e Não compareceu são finais; o atendimento não tem caminho de alteração', async () => {
    const { url } = await setup();
    const a = (await schedule(url, '2026-10-08T09:00:00-03:00').expect(201)).body;
    t.clock.set('2026-10-09T08:00:00-03:00');
    const ns = (
      await t.api
        .post(`${url}/appointments/${a.id}/no-show`)
        .set(idem())
        .send({ version: a.version })
        .expect(200)
    ).body;
    expect(ns.status).toBe('no_show');
    expect(
      (
        await t.api
          .post(`${url}/appointments/${a.id}/cancel`)
          .set(idem())
          .send({ version: ns.version })
          .expect(422)
      ).body.error.code,
    ).toBe('invalid_transition');
    await t.api.patch(`${url}/encounters/1`).set(idem()).send({ chiefComplaint: 'outra' }).expect(404);
  });

  it('T019: remarca e cancela só antes da data, sem apagar nada; versão vencida é 409', async () => {
    const { url } = await setup();
    const a = (await schedule(url, '2026-10-08T09:00:00-03:00').expect(201)).body;
    const r = (
      await t.api
        .patch(`${url}/appointments/${a.id}`)
        .set(idem())
        .send({ version: a.version, scheduledAt: '2026-10-09T10:00:00-03:00' })
        .expect(200)
    ).body;
    expect(r.scheduledAt).toBe('2026-10-09T13:00:00.000Z');
    await t.api
      .post(`${url}/appointments/${a.id}/cancel`)
      .set(idem())
      .send({ version: a.version })
      .expect(409);
    const c = (
      await t.api
        .post(`${url}/appointments/${a.id}/cancel`)
        .set(idem())
        .send({ version: r.version })
        .expect(200)
    ).body;
    expect(c.history.map((h: { to: string }) => h.to)).toEqual(['scheduled', 'cancelled']);
    expect(await testDb.count('appointments')).toBe(1);
    const b = (await schedule(url, '2026-10-08T09:00:00-03:00').expect(201)).body;
    t.clock.set('2026-10-09T08:00:00-03:00');
    await t.api
      .post(`${url}/appointments/${b.id}/cancel`)
      .set(idem())
      .send({ version: b.version })
      .expect(422);
    await t.api
      .patch(`${url}/appointments/${b.id}`)
      .set(idem())
      .send({ version: b.version, description: 'x' })
      .expect(422);
  });
});
