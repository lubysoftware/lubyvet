import { anOwnerInput } from '../builders/owner.builder';
import { bootApp, idem, type TestApp } from '../support/app';
import { aPetInput, postPet } from '../support/pets';
import { testDb } from '../support/test-db';

// 007: T012 (anonimização) e T019 (revisão de texto livre, D25).
describe('anonimização do dono', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp('2026-10-07T12:00:00-03:00');
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  const setup = async () => {
    const o = (
      await t.api
        .post('/api/owners')
        .set(idem())
        .send(anOwnerInput({ firstName: 'Mariana', lastName: 'Teixeira', telephone: '(11) 98765-4321' }))
        .expect(201)
    ).body;
    const p = (await postPet(t, o.id, aPetInput()).expect(201)).body;
    const url = `/api/owners/${o.id}/pets/${p.id}`;
    await t.api
      .post(`${url}/appointments`)
      .set(idem())
      .send({ scheduledAt: '2026-10-10T09:00:00-03:00', description: 'Ligar para mariana no 11 98765-4321' })
      .expect(201);
    await t.api
      .post(`${url}/encounters`)
      .set(idem())
      .send({ date: '2026-10-07', chiefComplaint: 'Tosse', diagnosis: 'Dona Teixeira relata piora' })
      .expect(201);
    return { o, url };
  };

  it('T012: tira o identificável de todos os caminhos de leitura, preserva o histórico e muda a data de alteração', async () => {
    const { o, url } = await setup();
    const before = (await t.api.get(`/api/owners/${o.id}`)).body;
    const res = await t.api.post(`/api/owners/${o.id}/anonymize`).set(idem()).send({}).expect(200);
    expect(res.body.pendingReview).toBeGreaterThan(0);
    const after = (await t.api.get(`/api/owners/${o.id}`)).body;
    expect([after.firstName, after.lastName, after.cpf, after.email]).toEqual([
      'Dono',
      'anonimizado',
      '',
      null,
    ]);
    expect(after.updatedAt > before.updatedAt).toBe(true);
    expect(JSON.stringify((await t.api.get('/api/owners?lastName=Teixeira')).body.items)).not.toContain(
      'Mariana',
    );
    const visits = (await t.api.get(`${url}/visits`)).body;
    expect([visits.appointments.length, visits.encounters.length]).toEqual([1, 1]);
    const { rows } = await testDb.sql.query<{ anonymized_by: number }>(
      'select anonymized_by from owner_anonymizations where owner_id = $1',
      [o.id],
    );
    expect(rows[0]?.anonymized_by).toBe(1);
  });

  it('T019: o Administrador revisa o texto livre e troca só os trechos confirmados por [removido]', async () => {
    const { o, url } = await setup();
    await t.api.post(`/api/owners/${o.id}/anonymize`).set(idem()).send({}).expect(200);
    const items = (await t.api.get(`/api/owners/${o.id}/free-text`).expect(200)).body as {
      entity: string;
      text: string;
      start: number;
      end: number;
    }[];
    expect(items.map((i) => i.text.slice(i.start, i.end).toLowerCase())).toEqual(
      expect.arrayContaining(['mariana', '11 98765-4321', 'teixeira']),
    );
    await t.api.post(`/api/owners/${o.id}/free-text/redact`).set(idem()).send({ spans: items }).expect(204);
    const visits = (await t.api.get(`${url}/visits`)).body;
    expect(visits.appointments[0].description).toBe('Ligar para [removido] no [removido]');
    expect(visits.encounters[0].diagnosis).toBe('Dona [removido] relata piora');
    expect((await t.api.get(`/api/owners/${o.id}/free-text`)).body).toEqual([]);
  });
});
