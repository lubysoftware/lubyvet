import { z } from 'zod';
import { pageOf } from '../pagination';

export const VET_LIMITS = { firstName: 30, lastName: 30 } as const;

export const VetOutput = z.object({
  id: z.number().int(),
  firstName: z.string(),
  lastName: z.string(),
  /** Em ordem alfabética (CA-1.2); vazio quando não tem nenhuma (CA-1.3). */
  specialties: z.array(z.object({ id: z.number().int(), name: z.string() })),
});
export type VetOutput = z.infer<typeof VetOutput>;

export const VetCatalogOutput = pageOf(VetOutput);
export type VetCatalogOutput = z.infer<typeof VetCatalogOutput>;

/** 004/CA-4.4: animais que este veterinário atendeu, a partir dos atendimentos que o registraram (D01). */
export const VetPatientsOutput = z.array(
  z.object({
    petId: z.number().int(),
    petName: z.string(),
    ownerId: z.number().int(),
    encounters: z.number().int(),
  }),
);
export type VetPatientsOutput = z.infer<typeof VetPatientsOutput>;
