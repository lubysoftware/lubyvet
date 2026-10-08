export interface SpeciesRow {
  id: number;
  name: string;
  status: string;
  version: number;
  petsCount: number;
}
/** D52: especialidade com situação, versão e quantos veterinários a têm. */
export interface SpecialtyRow {
  id: number;
  name: string;
  status: string;
  version: number;
  vetsCount: number;
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
  /** 009/US-2: as especialidades que se atribuem a um veterinário, em ordem alfabética. */
  listSpecialties(): Promise<SpecialtyRow[]>;
  createSpecialty(name: string): Promise<SpecialtyRow>;
  updateSpecialty(
    id: number,
    version: number,
    data: { name?: string | undefined; status?: string | undefined },
  ): Promise<SpecialtyRow | null>;
  findSpecialty(id: number): Promise<SpecialtyRow | null>;
  /** D52: dos ids informados, os de especialidade inativa (id inexistente não entra). */
  inactiveSpecialtyIds(ids: number[]): Promise<number[]>;
  createVet(firstName: string, lastName: string, specialtyIds: number[]): Promise<VetRow>;
  updateVet(
    id: number,
    version: number,
    data: {
      firstName?: string | undefined;
      lastName?: string | undefined;
      status?: string | undefined;
      addSpecialtyId?: number | undefined;
      removeSpecialtyId?: number | undefined;
    },
  ): Promise<VetRow | null>;
  findVet(id: number): Promise<VetRow | null>;
}
export const VOCABULARY_REPOSITORY = Symbol('VocabularyRepository');
