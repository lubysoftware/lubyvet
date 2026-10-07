import type { Clock } from '../../../shared/domain/clock';
import { FieldRuleViolation } from '../../../shared/domain/errors';
import type { PetRepository } from '../../pets/application/ports/pet-repository.port';
import { PetNotFound } from '../../pets/domain/pet.errors';
import { Appointment } from '../domain/appointment';
import { Encounter, type EncounterFields } from '../domain/encounter';
import { AppointmentNotFound, PetNotSchedulable } from '../domain/visit.errors';
import type { VisitRepository } from './ports/visit-repository.port';

export interface PetRef {
  ownerId: number;
  petId: number;
}

/** Casos de uso da agenda (004). Todo acesso passa pelo dono e pelo animal (P1). */
export class Visits {
  constructor(
    private readonly visits: VisitRepository,
    private readonly pets: PetRepository,
    private readonly clock: Clock,
  ) {}

  private async pet(ref: PetRef) {
    const pet = await this.pets.findOfOwner(ref.ownerId, ref.petId);
    if (!pet) throw new PetNotFound();
    return pet;
  }

  private async appointment(ref: PetRef, appointmentId: number): Promise<Appointment> {
    await this.pet(ref);
    const a = await this.visits.findAppointment(ref.ownerId, ref.petId, appointmentId);
    if (!a) throw new AppointmentNotFound();
    return a;
  }

  /** US-1/T007: agendar visita; D09: animal Falecido ou Transferido não aceita. */
  async schedule(ref: PetRef, input: { scheduledAt: Date; description: string }): Promise<Appointment> {
    const pet = await this.pet(ref);
    if (!pet.canBeScheduled()) throw new PetNotSchedulable();
    return this.visits.insertAppointment(Appointment.schedule(ref.petId, input, this.clock.now()));
  }

  async reschedule(
    ref: PetRef,
    id: number,
    input: { scheduledAt?: Date | undefined; description?: string | undefined },
    version: number,
  ): Promise<Appointment> {
    const a = await this.appointment(ref, id);
    a.reschedule(input, version, this.clock.now());
    return this.visits.updateAppointment(a, version);
  }

  async cancel(ref: PetRef, id: number, version: number): Promise<Appointment> {
    const a = await this.appointment(ref, id);
    a.cancel(version, this.clock.now());
    return this.visits.updateAppointment(a, version);
  }

  async markNoShow(ref: PetRef, id: number, version: number): Promise<Appointment> {
    const a = await this.appointment(ref, id);
    a.markNoShow(version, this.clock.now());
    return this.visits.updateAppointment(a, version);
  }

  /** US-3/US-4: registrar atendimento, ligado ao agendamento quando houver, que vira Realizada. */
  async recordEncounter(
    ref: PetRef,
    input: EncounterFields & { appointmentId?: number | undefined; appointmentVersion?: number | undefined },
  ): Promise<Encounter> {
    await this.pet(ref);
    const now = this.clock.now();
    if (input.appointmentId === undefined)
      return this.visits.recordEncounter(Encounter.record(ref.petId, null, input, now));
    if (input.appointmentVersion === undefined)
      throw new FieldRuleViolation([{ path: 'appointmentVersion', code: 'required' }]);
    const a = await this.appointment(ref, input.appointmentId);
    const encounter = Encounter.record(ref.petId, input.appointmentId, input, now);
    a.markDone(input.appointmentVersion, now);
    return this.visits.recordEncounter(encounter, { appointment: a, version: input.appointmentVersion });
  }

  /** T015: a ficha do animal distingue o agendado do atendido. */
  async listOfPet(ref: PetRef): Promise<{ appointments: Appointment[]; encounters: Encounter[]; now: Date }> {
    await this.pet(ref);
    return { ...(await this.visits.listOfPet(ref.petId)), now: this.clock.now() };
  }
}
