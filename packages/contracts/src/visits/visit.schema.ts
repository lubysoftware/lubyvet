import { z } from 'zod';

/** D26: limites do atendimento, os mesmos no banco (P3). */
export const VISIT_LIMITS = {
  description: 255,
  chiefComplaint: 500,
  diagnosis: 2000,
  conduct: 2000,
  weightMin: 0.01,
  weightMax: 999.99,
} as const;

/** D10: Agendada → Realizada | Cancelada | Não compareceu; os três destinos são finais. */
export const APPOINTMENT_STATUS = ['scheduled', 'done', 'cancelled', 'no_show'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number];

const isoDateTime = z.iso.datetime({ offset: true, error: 'invalid_format' });
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'invalid_format' });
const optionalText = (max: number) => z.string().trim().max(max, { error: 'too_long' }).optional();

export const ScheduleAppointmentInput = z.object({
  scheduledAt: z.string({ error: 'required' }).pipe(isoDateTime),
  description: z
    .string({ error: 'required' })
    .trim()
    .min(1, { error: 'required' })
    .max(VISIT_LIMITS.description, { error: 'too_long' }),
});
export type ScheduleAppointmentInput = z.infer<typeof ScheduleAppointmentInput>;

/** 004/T017: remarcar um agendamento futuro. */
export const RescheduleAppointmentInput = z.object({
  version: z.number({ error: 'required' }).int().min(0),
  scheduledAt: isoDateTime.optional(),
  description: z
    .string()
    .trim()
    .min(1, { error: 'required' })
    .max(VISIT_LIMITS.description, { error: 'too_long' })
    .optional(),
});
export type RescheduleAppointmentInput = z.infer<typeof RescheduleAppointmentInput>;

export const VersionInput = z.object({ version: z.number({ error: 'required' }).int().min(0) });
export type VersionInput = z.infer<typeof VersionInput>;

/** D26 e D06: atendimento com data passada ou de hoje; ligado a um agendamento quando houver. */
export const RecordEncounterInput = z.object({
  appointmentId: z.number().int().positive().optional(),
  appointmentVersion: z.number().int().min(0).optional(),
  date: z.string({ error: 'required' }).pipe(isoDate),
  chiefComplaint: z
    .string({ error: 'required' })
    .trim()
    .min(1, { error: 'required' })
    .max(VISIT_LIMITS.chiefComplaint, { error: 'too_long' }),
  weightKg: z
    .number()
    .min(VISIT_LIMITS.weightMin, { error: 'out_of_range' })
    .max(VISIT_LIMITS.weightMax, { error: 'out_of_range' })
    .optional(),
  diagnosis: optionalText(VISIT_LIMITS.diagnosis),
  conduct: optionalText(VISIT_LIMITS.conduct),
  returnDate: isoDate.optional(),
  vetId: z.number().int().positive().optional(),
});
export type RecordEncounterInput = z.infer<typeof RecordEncounterInput>;

export const EncounterOutput = z.object({
  id: z.number().int(),
  petId: z.number().int(),
  appointmentId: z.number().int().nullable(),
  date: z.string(),
  chiefComplaint: z.string(),
  weightKg: z.number().nullable(),
  diagnosis: z.string().nullable(),
  conduct: z.string().nullable(),
  returnDate: z.string().nullable(),
  vetId: z.number().int().nullable(),
  createdAt: z.string(),
});
export type EncounterOutput = z.infer<typeof EncounterOutput>;

export const AppointmentOutput = z.object({
  id: z.number().int(),
  petId: z.number().int(),
  scheduledAt: z.string(),
  description: z.string(),
  status: z.enum(APPOINTMENT_STATUS),
  /** D11: derivado na leitura; agendado com data passada e ainda sem registro. */
  pendingRecord: z.boolean(),
  version: z.number().int(),
  history: z.array(
    z.object({ from: z.enum(APPOINTMENT_STATUS).nullable(), to: z.enum(APPOINTMENT_STATUS), at: z.string() }),
  ),
});
export type AppointmentOutput = z.infer<typeof AppointmentOutput>;

/** 004/T015: a ficha do animal distingue o agendado do atendido. */
export const PetVisitsOutput = z.object({
  appointments: z.array(AppointmentOutput),
  encounters: z.array(EncounterOutput),
});
export type PetVisitsOutput = z.infer<typeof PetVisitsOutput>;
