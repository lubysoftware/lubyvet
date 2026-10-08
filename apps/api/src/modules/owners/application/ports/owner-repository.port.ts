import type { Owner } from '../../domain/owner';

export interface SimilarCandidate {
  id: number;
  firstName: string;
  lastName: string;
  city: string;
}

/** Porta do agregado Dono (P1: animal e visita só se alcançam por aqui). */
export interface OwnerRepository {
  /** Grava um dono novo; o identificador nasce no banco (P4). */
  insert(owner: Owner): Promise<Owner>;
  findById(id: number): Promise<Owner | null>;
  /** Grava a alteração só se a versão no banco ainda for `expectedVersion` (US-5). */
  update(owner: Owner, expectedVersion: number): Promise<Owner>;
  /** D14: donos com o mesmo celular, exceto o informado. */
  findByTelephone(telephone: string, exceptId?: number): Promise<SimilarCandidate[]>;
}
/** 007/T018, D02: quem criou e quem alterou por último, e quando. */
export interface Authorship {
  createdBy: { id: number; name: string } | null;
  createdAt: string;
  updatedBy: { id: number; name: string } | null;
  updatedAt: string;
}
export interface OwnerAuthorshipReader {
  authorship(ownerId: number): Promise<Authorship | null>;
}
export const OWNER_AUTHORSHIP = Symbol('OwnerAuthorship');

export const OWNER_REPOSITORY = Symbol('OwnerRepository');

/** 012/T003, D51: uma dispensa do aviso de dono parecido, contra um candidato. */
export interface SimilarityDismissal {
  similarOwner: { id: number; firstName: string; lastName: string };
  dismissedBy: { id: number; name: string };
  dismissedAt: Date;
}
export interface SimilarityDismissalReader {
  /** Dispensas do dono, da mais recente para a mais antiga; null quando o dono não existe. */
  dismissalsOf(ownerId: number): Promise<SimilarityDismissal[] | null>;
}
export const SIMILARITY_DISMISSALS = Symbol('SimilarityDismissals');
