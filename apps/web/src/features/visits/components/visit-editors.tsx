'use client';

import {
  type AppointmentOutput,
  type EncounterOutput,
  RecordEncounterInput,
  RescheduleAppointmentInput,
  ScheduleAppointmentInput,
} from '@lubyvet/contracts';
import type { z } from 'zod';
import { FailureMessage } from '@/components/ui/failure-message';
import { type Option, AppointmentForm, EncounterForm } from '@/features/forms/components/forms';
import { optional, optionalNumber } from '@/features/forms/form-values';
import { useApiForm } from '@/features/forms/use-api-form';
import { apiSend } from '@/lib/api-client';
import { fromLocalInput, toLocalInput } from '@/lib/format';

type Raw = Record<string, string>;
const back = (ownerId: number, petId: number, saved: string) =>
  window.location.assign(`/owners/${ownerId}?pet=${petId}&saved=${saved}`);

/** O campo datetime-local dá a hora do balcão; o contrato pede o instante com fuso. */
export const appointmentInput = (raw: Raw, version?: number) => ({
  ...(version === undefined ? {} : { version }),
  scheduledAt: fromLocalInput(optional(raw.scheduledAt)),
  description: raw.description,
});

export function encounterInput(raw: Raw, appointment?: { id: number; version: number }) {
  return {
    appointmentId: appointment?.id,
    appointmentVersion: appointment?.version,
    date: raw.date,
    chiefComplaint: raw.chiefComplaint,
    weightKg: optionalNumber(raw.weightKg),
    diagnosis: optional(raw.diagnosis),
    conduct: optional(raw.conduct),
    returnDate: optional(raw.returnDate),
    vetId: optionalNumber(raw.vetId),
  };
}

/** 004/US-1 e US-5: agendar e remarcar, sempre pelo dono e pelo animal (P1). */
export function AppointmentEditor({
  ownerId,
  petId,
  appointment,
  limits = {},
}: {
  ownerId: number;
  petId: number;
  appointment?: AppointmentOutput;
  /** Preparação do formulário (004/T006): limite do campo e data sugerida, no fuso do negócio. */
  limits?: { min?: string; suggested?: string };
}) {
  const base = `/api/owners/${ownerId}/pets/${petId}/appointments`;
  const form = useApiForm(
    (appointment ? RescheduleAppointmentInput : ScheduleAppointmentInput) as z.ZodType<
      Record<string, unknown>
    >,
    (input, key) =>
      appointment
        ? apiSend<AppointmentOutput>('PATCH', `${base}/${appointment.id}`, input, key)
        : apiSend<AppointmentOutput>('POST', base, input, key),
    () => back(ownerId, petId, 'appointmentSaved'),
  );
  return (
    <div className="grid gap-4">
      <FailureMessage failure={form.failure} />
      <AppointmentForm
        errors={form.errors}
        pending={form.pending}
        min={limits.min}
        defaults={
          appointment
            ? { scheduledAt: toLocalInput(appointment.scheduledAt), description: appointment.description }
            : { scheduledAt: limits.suggested }
        }
        onSubmit={(raw) => void form.submit(appointmentInput(raw, appointment?.version))}
      />
    </div>
  );
}

/** 004/US-3 e US-4: atendimento de hoje ou retroativo, ligado ao agendamento quando houver. */
export function EncounterEditor({
  ownerId,
  petId,
  vets,
  appointment,
  dates = {},
}: {
  ownerId: number;
  petId: number;
  vets: Option[];
  appointment?: { id: number; version: number };
  /** Hoje e o primeiro dia de retorno, no fuso do negócio (D06, D26). */
  dates?: { today?: string; firstReturn?: string };
}) {
  const form = useApiForm(
    RecordEncounterInput,
    (input, key) =>
      apiSend<EncounterOutput>('POST', `/api/owners/${ownerId}/pets/${petId}/encounters`, input, key),
    () => back(ownerId, petId, 'encounterSaved'),
  );
  return (
    <div className="grid gap-4">
      <FailureMessage failure={form.failure} />
      <EncounterForm
        errors={form.errors}
        pending={form.pending}
        vets={vets}
        today={dates.today}
        firstReturn={dates.firstReturn}
        onSubmit={(raw) => void form.submit(encounterInput(raw, appointment))}
      />
    </div>
  );
}
