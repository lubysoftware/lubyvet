import { type DomainEvents, NO_EVENTS } from '../../../shared/domain/events';
import type { Clock } from '../../../shared/domain/clock';
import type { OwnerRepository } from '../../owners/application/ports/owner-repository.port';
import { Pet, type PetFields } from '../domain/pet';
import { PetNameTaken, UnknownSpecies } from '../domain/pet.errors';
import { FieldRuleViolation, NotFound } from '../../../shared/domain/errors';
import type { PetRepository, SpeciesCatalog } from './ports/pet-repository.port';

/** Cadastrar animal do dono (US-1): um dono e uma espécie, nome livre entre os animais dele. */
export class RegisterPet {
  constructor(
    private readonly owners: OwnerRepository,
    private readonly pets: PetRepository,
    private readonly species: SpeciesCatalog,
    private readonly clock: Clock,
    private readonly events: DomainEvents = NO_EVENTS,
  ) {}

  async execute(ownerId: number, fields: PetFields): Promise<Pet> {
    if (!(await this.owners.findById(ownerId))) throw new NotFound('owner_not_found');
    const pet = Pet.register(ownerId, fields, this.clock.now());
    const species = await this.species.findById(pet.speciesId);
    if (!species) throw new UnknownSpecies();
    if (species.status !== undefined && species.status !== 'active')
      throw new FieldRuleViolation([{ path: 'speciesId', code: 'species_inactive' }]);
    if (await this.pets.nameTaken(ownerId, pet.name)) throw new PetNameTaken();
    const saved = await this.pets.insert(pet);
    this.events.publish({ type: 'pet_registered', petId: saved.id ?? 0 });
    return saved;
  }
}
