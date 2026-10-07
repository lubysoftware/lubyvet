import { z } from 'zod';
import { PageQuery, pageOf } from '../pagination';
import { EMAIL_MAX, isBrazilianMobile, isValidCpf, isValidEmail } from '../rules';

/** Limites do dono, os mesmos no schema do banco (P3, P6). */
export const OWNER_LIMITS = {
  firstName: 30,
  lastName: 30,
  address: 255,
  city: 80,
  email: EMAIL_MAX,
} as const;

const text = (max: number) =>
  z.string({ error: 'required' }).trim().min(1, { error: 'required' }).max(max, { error: 'too_long' });

export const telephoneField = z
  .string({ error: 'required' })
  .trim()
  .min(1, { error: 'required' })
  .refine(isBrazilianMobile, { error: 'invalid_phone' });
export const cpfField = z
  .string({ error: 'required' })
  .trim()
  .min(1, { error: 'required' })
  .refine(isValidCpf, { error: 'invalid_cpf' });
export const emailField = z
  .string()
  .trim()
  .max(OWNER_LIMITS.email, { error: 'too_long' })
  .refine(isValidEmail, { error: 'invalid_email' });

export const RegisterOwnerInput = z.object({
  firstName: text(OWNER_LIMITS.firstName),
  lastName: text(OWNER_LIMITS.lastName),
  address: text(OWNER_LIMITS.address),
  city: text(OWNER_LIMITS.city),
  telephone: telephoneField,
  cpf: cpfField,
  email: emailField.optional(),
  messagingConsent: z.boolean().default(false),
  /** D14: o usuário viu o aviso de dono parecido e decidiu gravar mesmo assim. */
  confirmSimilar: z.boolean().default(false),
});
export type RegisterOwnerInput = z.infer<typeof RegisterOwnerInput>;

/**
 * Alteração parcial (Pergunta 22): campo ausente não muda; campo presente e vazio limpa,
 * e aí a obrigatoriedade reprova. `version` é obrigatória (US-5).
 */
export const ChangeOwnerContactInput = z.object({
  /** REG-05: quando presente, tem de ser o dono do endereço pedido. */
  id: z.number().int().optional(),
  version: z.number({ error: 'required' }).int().min(0),
  firstName: text(OWNER_LIMITS.firstName).optional(),
  lastName: text(OWNER_LIMITS.lastName).optional(),
  address: text(OWNER_LIMITS.address).optional(),
  city: text(OWNER_LIMITS.city).optional(),
  telephone: telephoneField.optional(),
  email: z.union([emailField, z.literal('')]).optional(),
  messagingConsent: z.boolean().optional(),
  confirmSimilar: z.boolean().default(false),
});
export type ChangeOwnerContactInput = z.infer<typeof ChangeOwnerContactInput>;

export const OwnerOutput = z.object({
  id: z.number().int(),
  firstName: z.string(),
  lastName: z.string(),
  address: z.string(),
  city: z.string(),
  telephone: z.string(),
  cpf: z.string(),
  email: z.string().nullable(),
  messagingConsentAt: z.string().nullable(),
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OwnerOutput = z.infer<typeof OwnerOutput>;

/** D14: candidato apresentado antes de gravar quando o celular já pertence a outro dono. */
export const SimilarOwner = z.object({
  id: z.number().int(),
  firstName: z.string(),
  lastName: z.string(),
  city: z.string(),
});
export type SimilarOwner = z.infer<typeof SimilarOwner>;

/** 002: busca pelo começo do sobrenome; termo vazio lista todos (D04: exige login). */
export const SearchOwnersQuery = PageQuery.extend({
  lastName: z.string().max(OWNER_LIMITS.lastName, { error: 'too_long' }).default(''),
});
export type SearchOwnersQuery = z.infer<typeof SearchOwnersQuery>;

export const OwnerSummary = z.object({
  id: z.number().int(),
  firstName: z.string(),
  lastName: z.string(),
  address: z.string(),
  city: z.string(),
  telephone: z.string(),
  petNames: z.array(z.string()),
});
export type OwnerSummary = z.infer<typeof OwnerSummary>;

/** O termo normalizado volta junto, para os links de página o carregarem (002/T006). */
export const OwnerSearchOutput = pageOf(OwnerSummary).extend({ lastName: z.string() });
export type OwnerSearchOutput = z.infer<typeof OwnerSearchOutput>;
