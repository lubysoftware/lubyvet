import {
  AppointmentOutput,
  EncounterOutput,
  VISIT_LIMITS,
  appointmentAllowed,
  businessToday,
  encounterDateAllowed,
  firstReturnDate,
  suggestedAppointment,
} from '@lubyvet/contracts';
import { appointmentAccepts, encounterAccepts, todayIn } from '../../src/modules/visits/domain/date-policy';
import { bootApp, idem, type TestApp } from '../support/app';
import { aPetInput, anOwner, patchPet, postPet } from '../support/pets';
import { readRepo } from '../support/structural';
import { CONSISTENCY } from '../support/consistency';
import { testDb } from '../support/test-db';

const NOW = '2026-10-07T12:00:00-03:00';
const fieldOf = (body: { error?: { fields?: { path: string; code: string }[] } }) =>
  Object.fromEntries((body.error?.fields ?? []).map((f) => [f.path, f.code]));
const pt = JSON.parse(readRepo('apps/web/src/i18n/messages/pt-BR.json')) as {
  visits: Record<string, string>;
};

describe('004 Agenda e atendimento de visitas: critérios de aceite', () => {
  let t: TestApp;
  let base: string;
  let ownerId: number;
  beforeAll(async () => {
    t = await bootApp(NOW);
  });
  beforeEach(async () => {
    t.clock.set(NOW);
    await testDb.truncate();
    const o = await anOwner(t);
    ownerId = o.id;
    const p = (await postPet(t, o.id, aPetInput()).expect(201)).body;
    base = `/api/owners/${o.id}/pets/${p.id}`;
  });
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  const schedule = (scheduledAt: string, description = 'Consulta') =>
    t.api.post(`${base}/appointments`).set(idem()).send({ scheduledAt, description });
  const record = (body: object) =>
    t.api
      .post(`${base}/encounters`)
      .set(idem())
      .send({ date: '2026-10-07', chiefComplaint: 'Tosse', ...body });
  const visits = async () => (await t.api.get(`${base}/visits`).expect(200)).body;
  const aVet = async (status = 'active') => {
    const vet = (
      await t.api.post('/api/admin/vets').set(idem()).send({ firstName: 'Helena', lastName: 'Costa' })
    ).body;
    if (status !== 'active')
      await t.api
        .patch(`/api/admin/vets/${vet.id}`)
        .set(idem())
        .send({ version: vet.version, status })
        .expect(200);
    return vet as { id: number };
  };

  it('004/CA-1.1 com data válida e descrição a visita é gravada vinculada ao animal', async () => {
    const res = await schedule('2026-10-20T10:00:00-03:00').expect(201);
    expect(AppointmentOutput.parse(res.body)).toMatchObject({ status: 'scheduled', description: 'Consulta' });
    expect((await visits()).appointments.map((a: { id: number }) => a.id)).toEqual([res.body.id]);
  });

  it('004/CA-1.2 descrição vazia ou acima de 255 marca o campo e nada é gravado', async () => {
    expect(fieldOf((await schedule('2026-10-20T10:00:00-03:00', ' ').expect(422)).body).description).toBe(
      'required',
    );
    const long = await schedule('2026-10-20T10:00:00-03:00', 'x'.repeat(256)).expect(422);
    expect(fieldOf(long.body).description).toBe('too_long');
    await schedule('2026-10-20T10:00:00-03:00', 'x'.repeat(255)).expect(201);
    expect(await testDb.count('appointments')).toBe(1);
  });

  it('004/CA-1.3 data fora da faixa é recusada no campo de data', async () => {
    expect(fieldOf((await schedule('2026-10-01T10:00:00-03:00').expect(422)).body).scheduledAt).toBe(
      'date_in_past',
    );
    expect(fieldOf((await schedule('amanhã').expect(422)).body).scheduledAt).toBe('invalid_format');
  });

  it('004/CA-1.4 a data sugerida e o limite do formulário saem da regra que a API aplica (a tela é provada no E2E)', async () => {
    const now = new Date(NOW);
    expect(suggestedAppointment(now).toISOString()).toBe('2026-10-08T15:00:00.000Z');
    await schedule(suggestedAppointment(now).toISOString()).expect(201);
    for (const delta of [-60_000, 0, 60_000, 86_400_000]) {
      const at = new Date(now.getTime() + delta);
      expect(appointmentAllowed(at, now)).toBe(appointmentAccepts(at, now));
    }
  });

  it('004/CA-2.1 o histórico do animal vem em ordem crescente de data, com data e descrição', async () => {
    for (const d of ['2026-12-01', '2026-10-20', '2026-11-05'])
      await schedule(`${d}T10:00:00-03:00`, d).expect(201);
    expect((await visits()).appointments.map((a: { description: string }) => a.description)).toEqual([
      '2026-10-20',
      '2026-11-05',
      '2026-12-01',
    ]);
  });

  it('004/CA-2.2 a visita em preparação não aparece no histórico', async () => {
    await schedule('2026-10-01T10:00:00-03:00', 'recusada').expect(422);
    expect((await visits()).appointments).toEqual([]);
  });

  it('004/CA-2.3 animal sem visita tem a seção vazia com mensagem de ausência', async () => {
    expect(await visits()).toEqual({ appointments: [], encounters: [] });
    expect(pt.visits.noneScheduled).toBeTruthy();
    expect(pt.visits.noneAttended).toBeTruthy();
  });

  it('004/CA-2.4 o rótulo da seção corresponde ao recorte: agendadas e atendimentos, nunca "anteriores"', () => {
    expect(pt.visits.scheduledSection).toBe('Visitas agendadas');
    expect(pt.visits.attendedSection).toBe('Atendimentos realizados');
    expect(Object.values(pt.visits).join(' ')).not.toMatch(/anteriores/i);
  });

  it('004/CA-3.1 atendimento com a data de hoje é aceito', async () => {
    expect((await record({ date: '2026-10-07' }).expect(201)).body.date).toBe('2026-10-07');
  });

  it('004/CA-3.2 atendimento aceita qualquer data passada e recusa data futura (D06)', async () => {
    await record({ date: '1999-01-01' }).expect(201);
    expect(fieldOf((await record({ date: '2026-10-08' }).expect(422)).body).date).toBe('date_in_future');
  });

  it('004/CA-3.3 a sugestão e o limite do formulário de atendimento acompanham a regra (hoje)', () => {
    const now = new Date(NOW);
    expect(businessToday(now)).toBe(todayIn(now));
    expect(firstReturnDate(now)).toBe('2026-10-08');
    for (const d of ['2026-10-06', '2026-10-07', '2026-10-08'])
      expect(encounterDateAllowed(d, now)).toBe(encounterAccepts(d, now));
    const late = new Date('2026-10-08T01:30:00Z'); // 22:30 de 07/10 em São Paulo
    expect(businessToday(late)).toBe('2026-10-07');
  });

  it('004/CA-4.1 a visita tem situação e cada mudança fica registrada com data (D10)', async () => {
    const a = (await schedule('2026-10-20T10:00:00-03:00')).body;
    const cancelled = await t.api
      .post(`${base}/appointments/${a.id}/cancel`)
      .set(idem())
      .send({ version: 0 })
      .expect(200);
    expect(cancelled.body.status).toBe('cancelled');
    expect(cancelled.body.history.map((h: { from: string | null; to: string }) => [h.from, h.to])).toEqual([
      [null, 'scheduled'],
      ['scheduled', 'cancelled'],
    ]);
    expect(cancelled.body.history.every((h: { at: string }) => !Number.isNaN(Date.parse(h.at)))).toBe(true);
    const again = await t.api.post(`${base}/appointments/${a.id}/no-show`).set(idem()).send({ version: 1 });
    expect(again.status).toBe(422);
  });

  it('004/CA-4.5 agendamento passado e ainda Agendado aparece pendente de registro, sem mudar de situação (D11)', async () => {
    const a = (await schedule('2026-10-08T10:00:00-03:00')).body;
    expect(a.pendingRecord).toBe(false);
    t.clock.set('2026-10-09T09:00:00-03:00');
    const read = (await visits()).appointments[0];
    expect(read).toMatchObject({ status: 'scheduled', pendingRecord: true });
    const { rows } = await testDb.sql.query('select status from appointments where id = $1', [a.id]);
    expect(rows[0]).toEqual({ status: 'scheduled' });
  });

  it('004/CA-4.6 animal Falecido ou Transferido não aceita agendamento (D09)', async () => {
    await patchPet(t, ownerId, Number(base.split('/').pop()), { version: 0, status: 'deceased' }).expect(200);
    const res = await schedule('2026-10-20T10:00:00-03:00').expect(422);
    expect(Object.values(fieldOf(res.body))).toContain('pet_not_schedulable');
  });

  it('004/CA-4.2 o atendimento pode registrar um veterinário ativo do catálogo; o campo é opcional (D01)', async () => {
    const vet = await aVet();
    expect((await record({ vetId: vet.id }).expect(201)).body.vetId).toBe(vet.id);
    expect((await record({}).expect(201)).body.vetId).toBeNull();
    const gone = await aVet('dismissed');
    expect(fieldOf((await record({ vetId: gone.id }).expect(422)).body).vetId).toBe('vet_inactive');
  });

  it('004/CA-4.7 o atendimento tem os campos e limites de D26', async () => {
    const full = await record({
      chiefComplaint: 'x'.repeat(VISIT_LIMITS.chiefComplaint),
      weightKg: 12.4,
      diagnosis: 'd'.repeat(VISIT_LIMITS.diagnosis),
      conduct: 'c'.repeat(VISIT_LIMITS.conduct),
      returnDate: '2026-10-21',
    }).expect(201);
    expect(EncounterOutput.parse(full.body)).toMatchObject({ weightKg: 12.4, returnDate: '2026-10-21' });
    const bad = await record({
      date: undefined,
      chiefComplaint: 'x'.repeat(501),
      weightKg: 1000,
      diagnosis: 'd'.repeat(2001),
      returnDate: '2026-10-01',
    }).expect(422);
    expect(fieldOf(bad.body)).toMatchObject({
      date: 'required',
      chiefComplaint: 'too_long',
      weightKg: 'out_of_range',
      diagnosis: 'too_long',
    });
    expect(fieldOf((await record({ returnDate: '2026-10-07' }).expect(422)).body).returnDate).toBe(
      'date_in_past',
    );
    const { rows } = await testDb.sql.query<{ column_name: string; character_maximum_length: number | null }>(
      "select column_name, character_maximum_length from information_schema.columns where table_name = 'encounters'",
    );
    const len = Object.fromEntries(rows.map((r) => [r.column_name, r.character_maximum_length]));
    expect(len).toMatchObject({ chief_complaint: 500, diagnosis: 2000, conduct: 2000 });
  });

  it('004/CA-4.3 a ficha do animal distingue o agendado do atendido', async () => {
    const a = (await schedule('2026-10-20T10:00:00-03:00')).body;
    await record({}).expect(201);
    const v = await visits();
    expect(v.appointments.map((x: { id: number }) => x.id)).toEqual([a.id]);
    expect(v.encounters).toHaveLength(1);
  });

  it('004/CA-4.4 o sistema responde quais animais um veterinário atendeu (D01)', async () => {
    const vet = await aVet();
    await record({ vetId: vet.id }).expect(201);
    await record({ vetId: vet.id, date: '2026-10-01' }).expect(201);
    const res = (await t.api.get(`/api/vets/${vet.id}/patients`).expect(200)).body;
    expect(res).toEqual([{ petId: Number(base.split('/').pop()), petName: 'Thor', ownerId, encounters: 2 }]);
  });

  it('004/CA-5.1 a visita futura pode ter data e descrição alteradas, e a ficha mostra', async () => {
    const a = (await schedule('2026-10-20T10:00:00-03:00')).body;
    await t.api
      .patch(`${base}/appointments/${a.id}`)
      .set(idem())
      .send({ version: 0, scheduledAt: '2026-10-22T15:00:00-03:00', description: 'Retorno' })
      .expect(200);
    const rec = (await t.api.get(`/api/owners/${ownerId}/record`)).body;
    expect(rec.pets[0].visits.items[0]).toMatchObject({
      scheduledAt: '2026-10-22T18:00:00.000Z',
      description: 'Retorno',
    });
  });

  it('004/CA-5.2 a visita futura pode ser cancelada e deixa de contar como compromisso', async () => {
    const a = (await schedule('2026-10-20T10:00:00-03:00')).body;
    await t.api.post(`${base}/appointments/${a.id}/cancel`).set(idem()).send({ version: 0 }).expect(200);
    const read = (await visits()).appointments[0];
    expect(read.status).toBe('cancelled');
    expect(read.pendingRecord).toBe(false);
  });

  it('004/CA-5.3 o cancelamento não apaga: sabe-se que houve e quando', async () => {
    const a = (await schedule('2026-10-20T10:00:00-03:00')).body;
    t.clock.set('2026-10-10T08:00:00-03:00');
    await t.api.post(`${base}/appointments/${a.id}/cancel`).set(idem()).send({ version: 0 }).expect(200);
    expect(await testDb.count('appointments')).toBe(1);
    const h = (await visits()).appointments[0].history.at(-1);
    expect(h).toMatchObject({ to: 'cancelled', at: '2026-10-10T11:00:00.000Z' });
  });

  it('004 o fluxo da API deixa situação, histórico e atendimento coerentes (redundâncias de propósito)', async () => {
    const a = (await schedule('2026-10-20T10:00:00-03:00')).body;
    const b = (await schedule('2026-10-21T10:00:00-03:00')).body;
    await t.api.post(`${base}/appointments/${b.id}/cancel`).set(idem()).send({ version: 0 }).expect(200);
    await record({ appointmentId: a.id, appointmentVersion: 0 }).expect(201);
    expect((await testDb.sql.query(CONSISTENCY)).rows).toEqual([]);
  });
});
