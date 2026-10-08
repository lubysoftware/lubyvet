import { z } from 'zod';
import { VET_LIMITS } from './vet.schema';

const vocabularyName = z
  .string({ error: 'required' })
  .trim()
  .min(1, { error: 'required' })
  .max(80, { error: 'too_long' });
const vetName = (max: number) =>
  z.string({ error: 'required' }).trim().min(1, { error: 'required' }).max(max, { error: 'too_long' });

/** 009: manutenção do vocabulário de espécies (Administrador, D18). */
export const SpeciesInput = z.object({ name: vocabularyName });
export const ChangeSpeciesInput = z.object({
  version: z.number().int().min(0),
  name: vocabularyName.optional(),
  status: z.enum(['active', 'inactive'], { error: 'invalid_format' }).optional(),
});
export type ChangeSpeciesInput = z.infer<typeof ChangeSpeciesInput>;
export const AdminSpeciesOutput = z.object({
  id: z.number().int(),
  name: z.string(),
  status: z.string(),
  version: z.number().int(),
  petsCount: z.number().int(),
});

/** 009/US-2, D48: especialidade que se atribui a um veterinário. */
export const SpecialtyOutput = z.object({ id: z.number().int(), name: z.string() });
export type SpecialtyOutput = z.infer<typeof SpecialtyOutput>;

/** 012/US-4, D52: manutenção das especialidades (Administrador, D18), como a da espécie. */
export const SpecialtyInput = z.object({ name: vocabularyName });
export type SpecialtyInput = z.infer<typeof SpecialtyInput>;
export const ChangeSpecialtyInput = z.object({
  version: z.number().int().min(0),
  name: vocabularyName.optional(),
  status: z.enum(['active', 'inactive'], { error: 'invalid_format' }).optional(),
});
export type ChangeSpecialtyInput = z.infer<typeof ChangeSpecialtyInput>;
/** D52: a lista da administração traz também situação, versão e quantos veterinários a têm. */
export const AdminSpecialtyOutput = SpecialtyOutput.extend({
  status: z.string(),
  version: z.number().int(),
  vetsCount: z.number().int(),
});
export type AdminSpecialtyOutput = z.infer<typeof AdminSpecialtyOutput>;

/** 009: manutenção do quadro de veterinários (Administrador, D18). */
export const VetInput = z.object({
  firstName: vetName(VET_LIMITS.firstName),
  lastName: vetName(VET_LIMITS.lastName),
  specialtyIds: z.array(z.number().int().positive()).default([]),
});
export type VetInput = z.infer<typeof VetInput>;
export const ChangeVetInput = z.object({
  version: z.number().int().min(0),
  firstName: vetName(VET_LIMITS.firstName).optional(),
  lastName: vetName(VET_LIMITS.lastName).optional(),
  status: z.enum(['active', 'dismissed'], { error: 'invalid_format' }).optional(),
  addSpecialtyId: z.number().int().positive().optional(),
  /** D52: desfaz o vínculo; não apaga dado pessoal (P2). */
  removeSpecialtyId: z.number().int().positive().optional(),
});
export type ChangeVetInput = z.infer<typeof ChangeVetInput>;
export const AdminVetOutput = z.object({
  id: z.number().int(),
  firstName: z.string(),
  lastName: z.string(),
  status: z.string(),
  version: z.number().int(),
  specialtyIds: z.array(z.number().int()),
});
export type AdminVetOutput = z.infer<typeof AdminVetOutput>;
