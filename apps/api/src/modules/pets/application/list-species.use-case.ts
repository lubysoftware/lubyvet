import type { SpeciesCatalog, SpeciesRef } from './ports/pet-repository.port';

export class ListSpecies {
  constructor(private readonly species: SpeciesCatalog) {}
  execute(): Promise<SpeciesRef[]> {
    return this.species.list();
  }
}
