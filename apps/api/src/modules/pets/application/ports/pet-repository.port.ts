import type { Pet } from '../../domain/pet';

export interface SpeciesRef {
  id: number;
  name: string;
}

/**
 * P1: todo acesso ao animal leva o dono. Não existe busca de animal por identificador solto.
 */
export interface PetRepository {
  insert(pet: Pet): Promise<Pet>;
  findOfOwner(ownerId: number, petId: number): Promise<Pet | null>;
  update(pet: Pet, expectedVersion: number): Promise<Pet>;
  /** T008: verificação preventiva, só entre os animais daquele dono, sem diferenciar maiúsculas. */
  nameTaken(ownerId: number, name: string, exceptPetId?: number): Promise<boolean>;
}
export const PET_REPOSITORY = Symbol('PetRepository');

/** Vocabulário de espécies (003/T011, 009). */
export interface SpeciesCatalog {
  findById(id: number): Promise<SpeciesRef | null>;
  list(): Promise<SpeciesRef[]>;
  /** Resolução sem exigir grafia exata de maiúsculas. */
  findByName(name: string): Promise<SpeciesRef | null>;
}
export const SPECIES_CATALOG = Symbol('SpeciesCatalog');
