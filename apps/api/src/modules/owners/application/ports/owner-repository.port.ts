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
export const OWNER_REPOSITORY = Symbol('OwnerRepository');
