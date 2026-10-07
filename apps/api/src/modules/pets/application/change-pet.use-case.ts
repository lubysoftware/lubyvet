import type { PetStatus } from '@lubyvet/contracts';
import type { Clock } from '../../../shared/domain/clock';
import { FieldRuleViolation } from '../../../shared/domain/errors';
import type { Pet, PetPatch } from '../domain/pet';
import { PetNameTaken, UnknownSpecies } from '../domain/pet.errors';
import type { GetPet } from './get-pet.use-case';
import type { PetRepository, SpeciesCatalog } from './ports/pet-repository.port';

export interface ChangePetCommand {
  ownerId: number;
  petId: number;
  bodyId: number | undefined;
  version: number;
  patch: PetPatch;
  status?: PetStatus | undefined;
  /** D18: só o Administrador volta um animal para Ativo; a 007 entrega o papel. */
  actorIsAdmin?: boolean;
}

/** Alterar o animal (US-3): mesmo identificador, visitas intactas, mesmas regras do cadastro. */
export class ChangePet {
  constructor(
    private readonly resolve: GetPet,
    private readonly pets: PetRepository,
    private readonly species: SpeciesCatalog,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: ChangePetCommand): Promise<Pet> {
    const pet = await this.resolve.execute(cmd.ownerId, cmd.petId);
    if (cmd.bodyId !== undefined && cmd.bodyId !== cmd.petId)
      throw new FieldRuleViolation([{ path: 'id', code: 'id_mismatch' }]);
    pet.change(cmd.patch, cmd.version, this.clock.now());
    if (cmd.status) pet.changeStatus(cmd.status, cmd.actorIsAdmin ?? false);
    if (cmd.patch.speciesId && !(await this.species.findById(cmd.patch.speciesId)))
      throw new UnknownSpecies();
    if (cmd.patch.name !== undefined && (await this.pets.nameTaken(cmd.ownerId, pet.name, cmd.petId)))
      throw new PetNameTaken();
    return this.pets.update(pet, cmd.version);
  }
}
