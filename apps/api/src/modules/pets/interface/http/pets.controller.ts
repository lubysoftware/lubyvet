import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post } from '@nestjs/common';
import { ChangePetInput, type PetOutput, RegisterPetInput, type SpeciesOutput } from '@lubyvet/contracts';
import { StaleVersion } from '../../../../shared/domain/errors';
import { ChangePet } from '../../application/change-pet.use-case';
import { GetPet } from '../../application/get-pet.use-case';
import { Pet, type PetProps } from '../../domain/pet';
import { IdParamPipe } from '../../../../shared/interface/http/id-param.pipe';
import { ZodValidationPipe } from '../../../../shared/interface/http/zod-validation.pipe';
import { ListSpecies } from '../../application/list-species.use-case';
import { SPECIES_CATALOG, type SpeciesCatalog } from '../../application/ports/pet-repository.port';
import { RegisterPet } from '../../application/register-pet.use-case';
import { presentPet } from './pet.presenter';

@Controller()
export class PetsController {
  constructor(
    private readonly registerPet: RegisterPet,
    private readonly listSpecies: ListSpecies,
    private readonly getPet: GetPet,
    private readonly changePet: ChangePet,
    @Inject(SPECIES_CATALOG) private readonly species: SpeciesCatalog,
  ) {}

  @Get('species')
  async speciesList(): Promise<SpeciesOutput[]> {
    return this.listSpecies.execute();
  }

  /** US-1: cadastra o animal do dono; o front volta para a ficha do dono. */
  @Post('owners/:ownerId/pets')
  @HttpCode(201)
  async register(
    @Param('ownerId', new IdParamPipe('owner_not_found')) ownerId: number,
    @Body(new ZodValidationPipe(RegisterPetInput)) body: RegisterPetInput,
  ): Promise<PetOutput> {
    const pet = await this.registerPet.execute(ownerId, body);
    const species = (await this.species.findById(pet.speciesId)) ?? { id: pet.speciesId, name: '' };
    return presentPet(pet, species);
  }

  private async present(pet: Pet): Promise<PetOutput> {
    const species = (await this.species.findById(pet.speciesId)) ?? { id: pet.speciesId, name: '' };
    return presentPet(pet, species);
  }

  /** CA-3.1: abre a edição com os valores atuais; P1: só pelo dono informado. */
  @Get('owners/:ownerId/pets/:petId')
  async get(
    @Param('ownerId', new IdParamPipe('pet_not_found')) ownerId: number,
    @Param('petId', new IdParamPipe('pet_not_found')) petId: number,
  ): Promise<PetOutput> {
    return this.present(await this.getPet.execute(ownerId, petId));
  }

  @Patch('owners/:ownerId/pets/:petId')
  async change(
    @Param('ownerId', new IdParamPipe('pet_not_found')) ownerId: number,
    @Param('petId', new IdParamPipe('pet_not_found')) petId: number,
    @Body(new ZodValidationPipe(ChangePetInput)) body: ChangePetInput,
  ): Promise<PetOutput> {
    const { id, version, ...patch } = body;
    try {
      return await this.present(await this.changePet.execute({ ownerId, petId, bodyId: id, version, patch }));
    } catch (e) {
      if (e instanceof StaleVersion)
        throw new StaleVersion(await this.present(Pet.restore(e.current as PetProps)));
      throw e;
    }
  }
}
