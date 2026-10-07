import type { Clock } from '../../../shared/domain/clock';
import type { OwnerRepository } from '../../owners/application/ports/owner-repository.port';
import { Pet, type PetFields } from '../domain/pet';
import { PetNameTaken, UnknownSpecies } from '../domain/pet.errors';
import { NotFound } from '../../../shared/domain/errors';
import type { PetRepository, SpeciesCatalog } from './ports/pet-repository.port';

/** Cadastrar animal do dono (US-1): um dono e uma espécie, nome livre entre os animais dele. */
export class RegisterPet {
  constructor(
    private readonly owners: OwnerRepository,
    private readonly pets: PetRepository,
    private readonly species: SpeciesCatalog,
    private readonly clock: Clock,
  ) {}

  async execute(ownerId: number, fields: PetFields): Promise<Pet> {
    if (!(await this.owners.findById(ownerId))) throw new NotFound('owner_not_found');
    const pet = Pet.register(ownerId, fields, this.clock.now());
    if (!(await this.species.findById(pet.speciesId))) throw new UnknownSpecies();
    if (await this.pets.nameTaken(ownerId, pet.name)) throw new PetNameTaken();
    return this.pets.insert(pet);
  }
}
