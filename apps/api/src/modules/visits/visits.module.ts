import { Module } from '@nestjs/common';
import { CLOCK, type Clock } from '../../shared/domain/clock';
import { PET_REPOSITORY, type PetRepository } from '../pets/application/ports/pet-repository.port';
import { PetsModule } from '../pets/pets.module';
import { VISIT_REPOSITORY, type VisitRepository } from './application/ports/visit-repository.port';
import { Visits } from './application/visits.use-cases';
import { PrismaVisitRepository } from './infra/prisma-visit.repository';
import { VisitsController } from './interface/http/visits.controller';

@Module({
  imports: [PetsModule],
  controllers: [VisitsController],
  providers: [
    { provide: VISIT_REPOSITORY, useClass: PrismaVisitRepository },
    {
      provide: Visits,
      useFactory: (v: VisitRepository, p: PetRepository, c: Clock) => new Visits(v, p, c),
      inject: [VISIT_REPOSITORY, PET_REPOSITORY, CLOCK],
    },
  ],
  exports: [VISIT_REPOSITORY],
})
export class VisitsModule {}
