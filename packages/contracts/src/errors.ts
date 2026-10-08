import { z } from 'zod';

/**
 * Catálogo de códigos de erro (P-24, docs/padroes/contratos.md).
 * Todo código daqui tem tradução nos dois catálogos do web (P7).
 */
export const ERROR_CODES = [
  'unauthenticated',
  'forbidden',
  'invalid_credentials',
  'session_expired',
  'not_found',
  'owner_not_found',
  'pet_not_found',
  'appointment_not_found',
  'vet_not_found',
  'species_not_found',
  'specialty_not_found',
  'validation_failed',
  'stale_version',
  'invalid_transition',
  'idempotency_key_required',
  'request_in_progress',
  'unsupported_format',
  'similar_owner',
  'internal_error',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** Códigos de erro de campo, usados em `fields[].code` de um 422. */
export const FIELD_ERROR_CODES = [
  'required',
  'too_long',
  'too_short',
  'invalid_format',
  'invalid_phone',
  'invalid_cpf',
  'cpf_taken',
  'invalid_email',
  'pet_name_taken',
  'species_required',
  'species_inactive',
  'species_name_taken',
  'date_in_future',
  'date_in_past',
  'date_out_of_range',
  'pet_not_schedulable',
  'vet_inactive',
  'specialty_already_linked',
  'specialty_name_taken',
  'specialty_inactive',
  'out_of_range',
  'id_mismatch',
  'unknown_species',
  'appointment_not_schedulable',
  'species_in_use',
] as const;
export type FieldErrorCode = (typeof FIELD_ERROR_CODES)[number];

export const FieldError = z.object({ path: z.string(), code: z.enum(FIELD_ERROR_CODES) });
export type FieldError = z.infer<typeof FieldError>;

export const ErrorEnvelope = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    fields: z.array(FieldError).optional(),
    occurrenceId: z.string().optional(),
    current: z.unknown().optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

/** D18: papéis da equipe. */
export const ROLES = ['reader', 'writer', 'admin'] as const;
export type Role = (typeof ROLES)[number];
