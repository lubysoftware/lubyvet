import { type DomainEvents, NO_EVENTS } from '../../../shared/domain/events';
import type { Clock } from '../../../shared/domain/clock';
import { FieldRuleViolation } from '../../../shared/domain/errors';
import type { PetRepository } from '../../pets/application/ports/pet-repository.port';
import { PetNotFound } from '../../pets/domain/pet.errors';
import { Appointment } from '../domain/appointment';
import { Encounter, type EncounterFields } from '../domain/encounter';
import { AppointmentNotFound, PetNotSchedulable } from '../domain/visit.errors';
import type { VisitRepository } from './ports/visit-repository.port';

/** D01: o veterinário escolhido precisa existir no catálogo. */
export interface VetDirectory {
  exists(vetId: number): Promise<boolean>;
}
export const VET_DIRECTORY = Symbol('VetDirectory');

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
    private readonly vets: VetDirectory = { exists: async () => true },
    private readonly events: DomainEvents = NO_EVENTS,
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
    const saved = await this.visits.insertAppointment(
      Appointment.schedule(ref.petId, input, this.clock.now()),
    );
    this.events.publish({ type: 'appointment_scheduled', appointmentId: saved.id ?? 0 });
    return saved;
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
    const saved = await this.visits.updateAppointment(a, version);
    this.events.publish({ type: 'appointment_cancelled', appointmentId: id });
    return saved;
  }

  async markNoShow(ref: PetRef, id: number, version: number): Promise<Appointment> {
    const a = await this.appointment(ref, id);
    a.markNoShow(version, this.clock.now());
    const saved = await this.visits.updateAppointment(a, version);
    this.events.publish({ type: 'appointment_no_show', appointmentId: id });
    return saved;
  }

  /** US-3/US-4: registrar atendimento, ligado ao agendamento quando houver, que vira Realizada. */
  async recordEncounter(
    ref: PetRef,
    input: EncounterFields & { appointmentId?: number | undefined; appointmentVersion?: number | undefined },
  ): Promise<Encounter> {
    await this.pet(ref);
    if (input.vetId !== undefined && !(await this.vets.exists(input.vetId)))
      throw new FieldRuleViolation([{ path: 'vetId', code: 'vet_inactive' }]);
    const now = this.clock.now();
    let saved: Encounter;
    if (input.appointmentId === undefined) {
      saved = await this.visits.recordEncounter(Encounter.record(ref.petId, null, input, now));
    } else {
      if (input.appointmentVersion === undefined)
        throw new FieldRuleViolation([{ path: 'appointmentVersion', code: 'required' }]);
      const a = await this.appointment(ref, input.appointmentId);
      const encounter = Encounter.record(ref.petId, input.appointmentId, input, now);
      a.markDone(input.appointmentVersion, now);
      saved = await this.visits.recordEncounter(encounter, {
        appointment: a,
        version: input.appointmentVersion,
      });
    }
    this.events.publish({
      type: 'encounter_recorded',
      encounterId: saved.snapshot().id ?? 0,
      vetId: input.vetId ?? null,
      returnSuggested: Boolean(input.returnDate),
    });
    return saved;
  }

  /** T015: a ficha do animal distingue o agendado do atendido. */
  async listOfPet(ref: PetRef): Promise<{ appointments: Appointment[]; encounters: Encounter[]; now: Date }> {
    await this.pet(ref);
    return { ...(await this.visits.listOfPet(ref.petId)), now: this.clock.now() };
  }
}
