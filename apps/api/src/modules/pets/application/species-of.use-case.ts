import type { SpeciesCatalog, SpeciesRef } from './ports/pet-repository.port';

export type { SpeciesRef };

/** A espécie de um animal para a resposta (P-10): pelo identificador, mesmo se inativa. */
export class SpeciesOf {
  constructor(private readonly species: SpeciesCatalog) {}

  async execute(speciesId: number): Promise<{ id: number; name: string }> {
    const s: SpeciesRef | null = await this.species.findById(speciesId);
    return { id: speciesId, name: s?.name ?? '' };
  }
}
