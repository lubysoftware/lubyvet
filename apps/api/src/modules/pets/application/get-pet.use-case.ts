import type { Pet } from '../domain/pet';
import { PetNotFound } from '../domain/pet.errors';
import type { PetRepository } from './ports/pet-repository.port';

/**
 * T014, P1: a resolução única do animal, sempre pelo dono informado. Par que não combina é
 * "não encontrado", sem expor nada do animal.
 */
export class GetPet {
  constructor(private readonly pets: PetRepository) {}

  async execute(ownerId: number, petId: number): Promise<Pet> {
    const pet = await this.pets.findOfOwner(ownerId, petId);
    if (!pet || pet.ownerId !== ownerId) throw new PetNotFound();
    return pet;
  }
}
