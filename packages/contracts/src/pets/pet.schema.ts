import { z } from 'zod';

export const PET_LIMITS = { name: 30 } as const;

const name = z
  .string({ error: 'required' })
  .trim()
  .min(1, { error: 'required' })
  .max(PET_LIMITS.name, { error: 'too_long' });
/** Data de nascimento em YYYY-MM-DD; formato errado é erro de campo, nunca falha de conversão (UT-013-8). */
const birthDate = z.string({ error: 'required' }).regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'invalid_format' });
/** Espécie obrigatória sempre, inclusive na edição (Pergunta 5); enviada pelo identificador (P-10). */
const speciesId = z
  .number({ error: 'species_required' })
  .int({ error: 'species_required' })
  .positive({ error: 'species_required' });

export const RegisterPetInput = z.object({ name, birthDate, speciesId });
export type RegisterPetInput = z.infer<typeof RegisterPetInput>;

export const ChangePetInput = z.object({
  id: z.number().int().optional(),
  version: z.number({ error: 'required' }).int().min(0),
  name: name.optional(),
  birthDate: birthDate.optional(),
  speciesId: speciesId.optional(),
});
export type ChangePetInput = z.infer<typeof ChangePetInput>;

export const SpeciesOutput = z.object({ id: z.number().int(), name: z.string() });
export type SpeciesOutput = z.infer<typeof SpeciesOutput>;

export const PetOutput = z.object({
  id: z.number().int(),
  ownerId: z.number().int(),
  name: z.string(),
  birthDate: z.string(),
  species: SpeciesOutput,
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PetOutput = z.infer<typeof PetOutput>;
