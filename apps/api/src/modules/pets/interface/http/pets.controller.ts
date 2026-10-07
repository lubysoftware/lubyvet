import { Body, Controller, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { type PetOutput, RegisterPetInput, type SpeciesOutput } from '@lubyvet/contracts';
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
}
