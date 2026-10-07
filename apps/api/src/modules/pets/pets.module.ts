import { Module } from '@nestjs/common';
import { CLOCK, type Clock } from '../../shared/domain/clock';
import { OWNER_REPOSITORY, type OwnerRepository } from '../owners/application/ports/owner-repository.port';
import { OwnersModule } from '../owners/owners.module';
import { ChangePet } from './application/change-pet.use-case';
import { GetPet } from './application/get-pet.use-case';
import { ListSpecies } from './application/list-species.use-case';
import {
  PET_REPOSITORY,
  type PetRepository,
  SPECIES_CATALOG,
  type SpeciesCatalog,
} from './application/ports/pet-repository.port';
import { RegisterPet } from './application/register-pet.use-case';
import { PrismaPetRepository, PrismaSpeciesCatalog } from './infra/prisma-pet.repository';
import { PetsController } from './interface/http/pets.controller';

@Module({
  imports: [OwnersModule],
  controllers: [PetsController],
  providers: [
    { provide: PET_REPOSITORY, useClass: PrismaPetRepository },
    { provide: SPECIES_CATALOG, useClass: PrismaSpeciesCatalog },
    {
      provide: RegisterPet,
      useFactory: (o: OwnerRepository, p: PetRepository, s: SpeciesCatalog, c: Clock) =>
        new RegisterPet(o, p, s, c),
      inject: [OWNER_REPOSITORY, PET_REPOSITORY, SPECIES_CATALOG, CLOCK],
    },
    { provide: GetPet, useFactory: (p: PetRepository) => new GetPet(p), inject: [PET_REPOSITORY] },
    {
      provide: ChangePet,
      useFactory: (g: GetPet, p: PetRepository, s: SpeciesCatalog, c: Clock) => new ChangePet(g, p, s, c),
      inject: [GetPet, PET_REPOSITORY, SPECIES_CATALOG, CLOCK],
    },
    {
      provide: ListSpecies,
      useFactory: (s: SpeciesCatalog) => new ListSpecies(s),
      inject: [SPECIES_CATALOG],
    },
  ],
  exports: [PET_REPOSITORY, SPECIES_CATALOG, GetPet],
})
export class PetsModule {}
