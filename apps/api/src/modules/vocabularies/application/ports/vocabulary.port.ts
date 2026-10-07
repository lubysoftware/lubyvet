export interface SpeciesRow {
  id: number;
  name: string;
  status: string;
  version: number;
  petsCount: number;
}
export interface VetRow {
  id: number;
  firstName: string;
  lastName: string;
  status: string;
  version: number;
  specialtyIds: number[];
}

/** 009: escrita do vocabulário. Nada é apagado: espécie e veterinário saem de uso (P2). */
export interface VocabularyRepository {
  listSpecies(): Promise<SpeciesRow[]>;
  createSpecies(name: string): Promise<SpeciesRow>;
  updateSpecies(
    id: number,
    version: number,
    data: { name?: string | undefined; status?: string | undefined },
  ): Promise<SpeciesRow | null>;
  findSpecies(id: number): Promise<SpeciesRow | null>;
  listVets(): Promise<VetRow[]>;
  createVet(firstName: string, lastName: string, specialtyIds: number[]): Promise<VetRow>;
  updateVet(
    id: number,
    version: number,
    data: {
      firstName?: string | undefined;
      lastName?: string | undefined;
      status?: string | undefined;
      addSpecialtyId?: number | undefined;
    },
  ): Promise<VetRow | null>;
  findVet(id: number): Promise<VetRow | null>;
}
export const VOCABULARY_REPOSITORY = Symbol('VocabularyRepository');
