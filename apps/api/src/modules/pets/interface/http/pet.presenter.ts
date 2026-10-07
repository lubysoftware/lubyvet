import type { PetOutput } from '@lubyvet/contracts';
import type { SpeciesRef } from '../../application/species-of.use-case';
import type { Pet } from '../../domain/pet';

export function presentPet(pet: Pet, species: SpeciesRef): PetOutput {
  const s = pet.snapshot();
  return {
    id: s.id ?? 0,
    ownerId: s.ownerId,
    name: s.name,
    birthDate: s.birthDate,
    species: { id: species.id, name: species.name },
    status: s.status,
    version: s.version,
    createdAt: s.createdAt?.toISOString() ?? '',
    updatedAt: s.updatedAt?.toISOString() ?? '',
  };
}
