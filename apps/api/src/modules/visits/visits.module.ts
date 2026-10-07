import { DOMAIN_EVENTS, type DomainEvents } from '../../shared/domain/events';
import { Module } from '@nestjs/common';
import { CLOCK, type Clock } from '../../shared/domain/clock';
import { PET_REPOSITORY, type PetRepository } from '../pets/application/ports/pet-repository.port';
import { PetsModule } from '../pets/pets.module';
import { VISIT_REPOSITORY, type VisitRepository } from './application/ports/visit-repository.port';
import { VET_DIRECTORY, type VetDirectory, Visits } from './application/visits.use-cases';
import { PrismaVetDirectory } from './infra/prisma-vet-directory';
import { PrismaVisitRepository } from './infra/prisma-visit.repository';
import {
  GetOwnerRecord,
  OWNER_RECORD_READER,
  type OwnerRecordReader,
} from './application/owner-record.use-case';
import { PrismaOwnerRecordReader } from './infra/prisma-owner-record.reader';
import { OwnerRecordController } from './interface/http/owner-record.controller';
import { OWNER_REPOSITORY, type OwnerRepository } from '../owners/application/ports/owner-repository.port';
import { OwnersModule } from '../owners/owners.module';
import { VisitsController } from './interface/http/visits.controller';

@Module({
  imports: [PetsModule, OwnersModule],
  controllers: [VisitsController, OwnerRecordController],
  providers: [
    { provide: VET_DIRECTORY, useClass: PrismaVetDirectory },
    { provide: VISIT_REPOSITORY, useClass: PrismaVisitRepository },
    { provide: OWNER_RECORD_READER, useClass: PrismaOwnerRecordReader },
    {
      provide: GetOwnerRecord,
      useFactory: (o: OwnerRepository, r: OwnerRecordReader, c: Clock) => new GetOwnerRecord(o, r, c),
      inject: [OWNER_REPOSITORY, OWNER_RECORD_READER, CLOCK],
    },
    {
      provide: Visits,
      useFactory: (v: VisitRepository, p: PetRepository, c: Clock, d: VetDirectory, m: DomainEvents) =>
        new Visits(v, p, c, d, m),
      inject: [VISIT_REPOSITORY, PET_REPOSITORY, CLOCK, VET_DIRECTORY, DOMAIN_EVENTS],
    },
  ],
  exports: [VISIT_REPOSITORY],
})
export class VisitsModule {}
