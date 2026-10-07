import type { Appointment } from '../../domain/appointment';
import type { Encounter } from '../../domain/encounter';

/** P1: agendamento só se alcança pelo dono e pelo animal. */
export interface VisitRepository {
  insertAppointment(a: Appointment): Promise<Appointment>;
  findAppointment(ownerId: number, petId: number, appointmentId: number): Promise<Appointment | null>;
  /** Grava situação e campos se a versão ainda for a lida; insere as mudanças de situação novas. */
  updateAppointment(a: Appointment, expectedVersion: number): Promise<Appointment>;
  /** Grava o atendimento e, quando houver, o agendamento que ele realiza, numa transação. */
  recordEncounter(e: Encounter, realized?: { appointment: Appointment; version: number }): Promise<Encounter>;
  listOfPet(petId: number): Promise<{ appointments: Appointment[]; encounters: Encounter[] }>;
}
export const VISIT_REPOSITORY = Symbol('VisitRepository');
