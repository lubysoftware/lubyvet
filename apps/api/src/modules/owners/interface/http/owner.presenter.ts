import type { OwnerOutput } from '@lubyvet/contracts';
import type { Owner } from '../../domain/owner';

/** Entidade de domínio nunca é serializada direto (P9). */
export function presentOwner(owner: Owner): OwnerOutput {
  const s = owner.snapshot();
  return {
    id: s.id ?? 0,
    firstName: s.firstName,
    lastName: s.lastName,
    address: s.address,
    city: s.city,
    telephone: s.telephone,
    cpf: s.cpf ?? '',
    email: s.email,
    messagingConsentAt: s.messagingConsentAt?.toISOString() ?? null,
    version: s.version,
    createdAt: s.createdAt?.toISOString() ?? '',
    updatedAt: s.updatedAt?.toISOString() ?? '',
  };
}
