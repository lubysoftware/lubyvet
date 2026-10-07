import { FixedClock } from '../../../shared/domain/clock';
import { FieldRuleViolation } from '../../../shared/domain/errors';
import type { PetRepository } from '../../pets/application/ports/pet-repository.port';
import { Pet } from '../../pets/domain/pet';
import { PetNotFound } from '../../pets/domain/pet.errors';
import { Appointment } from '../domain/appointment';
import type { Encounter } from '../domain/encounter';
import { AppointmentNotFound, PetNotSchedulable } from '../domain/visit.errors';
import type { VisitRepository } from './ports/visit-repository.port';
import { Visits } from './visits.use-cases';

const clock = FixedClock.at('2026-10-07T12:00:00-03:00');
const LATER = new Date('2026-10-10T09:00:00-03:00');
const pet = (status: 'active' | 'deceased' = 'active') =>
  Pet.restore({
    ...Pet.register(7, { name: 'Thor', birthDate: '2020-01-01', speciesId: 2 }, clock.now()).snapshot(),
    id: 3,
    status,
  });
const pets = (p: Pet | null): PetRepository => ({
  insert: async (x) => x,
  findOfOwner: async () => p,
  update: async (x) => x,
  nameTaken: async () => false,
});
const store = () => {
  const appts: Appointment[] = [];
  const encounters: Encounter[] = [];
  const repo: VisitRepository = {
    insertAppointment: async (a) => {
      const saved = Appointment.restore({ ...a.snapshot(), id: appts.length + 1 });
      appts.push(saved);
      return saved;
    },
    findAppointment: async (_o, _p, id) => appts.find((a) => a.id === id) ?? null,
    updateAppointment: async (a) => a,
    recordEncounter: async (e) => (encounters.push(e), e),
    listOfPet: async () => ({ appointments: appts, encounters }),
  };
  return { repo, appts, encounters };
};
const ref = { ownerId: 7, petId: 3 };

describe('Visits', () => {
  it('agenda para animal ativo e recusa Falecido (D09)', async () => {
    const s = store();
    await new Visits(s.repo, pets(pet()), clock).schedule(ref, { scheduledAt: LATER, description: 'Vacina' });
    expect(s.appts).toHaveLength(1);
    await expect(
      new Visits(s.repo, pets(pet('deceased')), clock).schedule(ref, {
        scheduledAt: LATER,
        description: 'x',
      }),
    ).rejects.toBeInstanceOf(PetNotSchedulable);
  });

  it('animal de outro dono e agendamento inexistente são "não encontrado" (P1)', async () => {
    const s = store();
    await expect(new Visits(s.repo, pets(null), clock).listOfPet(ref)).rejects.toBeInstanceOf(PetNotFound);
    await expect(new Visits(s.repo, pets(pet()), clock).cancel(ref, 9, 0)).rejects.toBeInstanceOf(
      AppointmentNotFound,
    );
  });

  it('remarca, cancela, marca não comparecimento e registra atendimento', async () => {
    const s = store();
    const v = new Visits(s.repo, pets(pet()), clock);
    await v.schedule(ref, { scheduledAt: LATER, description: 'A' });
    await v.schedule(ref, { scheduledAt: LATER, description: 'B' });
    expect((await v.reschedule(ref, 1, { description: 'A2' }, 0)).snapshot().description).toBe('A2');
    expect((await v.cancel(ref, 1, 0)).status).toBe('cancelled');
    clock.set('2026-10-11T12:00:00-03:00');
    expect((await v.markNoShow(ref, 2, 0)).status).toBe('no_show');
    clock.set('2026-10-07T12:00:00-03:00');
    await v.schedule(ref, { scheduledAt: LATER, description: 'C' });
    await v.recordEncounter(ref, {
      date: '2026-10-07',
      chiefComplaint: 'Tosse',
      appointmentId: 3,
      appointmentVersion: 0,
    });
    expect(s.appts[2]?.status).toBe('done');
    await v.recordEncounter(ref, { date: '2026-01-01', chiefComplaint: 'Retroativo' });
    await expect(
      v.recordEncounter(ref, { date: '2026-10-07', chiefComplaint: 'x', appointmentId: 3 }),
    ).rejects.toBeInstanceOf(FieldRuleViolation);
    expect((await v.listOfPet(ref)).encounters).toHaveLength(2);
  });
});
