import request from 'supertest';
import { AppointmentOutput, EncounterOutput, PetVisitsOutput } from '@lubyvet/contracts';
import { bootApp, idem, type TestApp } from '../support/app';
import { anOwner, aPetInput, postPet } from '../support/pets';
import { testDb } from '../support/test-db';

describe('agenda e atendimento (004)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp('2026-10-07T12:00:00-03:00');
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });
  const base = async () => {
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput()).expect(201)).body;
    return `/api/owners/${o.id}/pets/${p.id}`;
  };

  it('agenda, registra o atendimento e a ficha distingue o agendado do atendido', async () => {
    const url = await base();
    const a = AppointmentOutput.parse(
      (
        await request(t.http)
          .post(`${url}/appointments`)
          .set(idem())
          .send({ scheduledAt: '2026-10-10T09:00:00-03:00', description: 'Vacina' })
          .expect(201)
      ).body,
    );
    expect(a).toMatchObject({ status: 'scheduled', pendingRecord: false });
    const e = EncounterOutput.parse(
      (
        await request(t.http)
          .post(`${url}/encounters`)
          .set(idem())
          .send({
            appointmentId: a.id,
            appointmentVersion: a.version,
            date: '2026-10-07',
            chiefComplaint: 'Vacina aplicada',
            weightKg: 12.4,
          })
          .expect(201)
      ).body,
    );
    expect(e.weightKg).toBe(12.4);
    const visits = PetVisitsOutput.parse((await request(t.http).get(`${url}/visits`).expect(200)).body);
    expect(visits.appointments[0]?.status).toBe('done');
    expect(visits.appointments[0]?.history.map((h) => h.to)).toEqual(['scheduled', 'done']);
    expect(visits.encounters).toHaveLength(1);
  });

  it('pendente de registro aparece sozinho quando a data passa (D11)', async () => {
    const url = await base();
    await request(t.http)
      .post(`${url}/appointments`)
      .set(idem())
      .send({ scheduledAt: '2026-10-07T12:30:00-03:00', description: 'Consulta' })
      .expect(201);
    t.clock.set('2026-10-08T08:00:00-03:00');
    const visits = (await request(t.http).get(`${url}/visits`).expect(200)).body;
    expect(visits.appointments[0]).toMatchObject({ status: 'scheduled', pendingRecord: true });
    t.clock.set('2026-10-07T12:00:00-03:00');
  });
});
