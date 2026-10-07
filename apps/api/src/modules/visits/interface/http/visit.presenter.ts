import type { AppointmentOutput, EncounterOutput } from '@lubyvet/contracts';
import type { Appointment } from '../../domain/appointment';
import type { Encounter } from '../../domain/encounter';

export function presentAppointment(a: Appointment, now: Date): AppointmentOutput {
  const s = a.snapshot();
  return {
    id: s.id ?? 0,
    petId: s.petId,
    scheduledAt: s.scheduledAt.toISOString(),
    description: s.description,
    status: s.status,
    pendingRecord: a.isPendingRecord(now),
    version: s.version,
    history: s.history.map((h) => ({ from: h.from, to: h.to, at: h.at.toISOString() })),
  };
}

export function presentEncounter(e: Encounter): EncounterOutput {
  const s = e.snapshot();
  return { ...s, id: s.id ?? 0, createdAt: s.createdAt?.toISOString() ?? '' };
}
