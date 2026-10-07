import { METRICS, type Metrics } from '../../shared/domain/metrics';
import { Module } from '@nestjs/common';
import { CLOCK, type Clock } from '../../shared/domain/clock';
import { ChangeOwnerContact } from './application/change-owner-contact.use-case';
import { GetOwner } from './application/get-owner.use-case';
import { OWNER_REPOSITORY, type OwnerRepository } from './application/ports/owner-repository.port';
import { RegisterOwner } from './application/register-owner.use-case';
import { OWNER_SEARCH, type OwnerSearchPort } from './application/ports/owner-search.port';
import { SearchOwners } from './application/search-owners.use-case';
import { PrismaOwnerSearch } from './infra/prisma-owner-search';
import {
  ANONYMIZATION,
  AnonymizeOwner,
  type AnonymizationPort,
} from './application/anonymize-owner.use-case';
import { PrismaAnonymization } from './infra/prisma-anonymization';
import { PrismaOwnerAuthorship } from './infra/prisma-owner-authorship';
import { GetAuthorship } from './application/get-authorship.use-case';
import { OWNER_AUTHORSHIP, type OwnerAuthorshipReader } from './application/ports/owner-repository.port';
import { PrismaOwnerRepository } from './infra/prisma-owner.repository';
import { AnonymizationController } from './interface/http/anonymization.controller';
import { OwnersController } from './interface/http/owners.controller';

@Module({
  controllers: [OwnersController, AnonymizationController],
  providers: [
    { provide: OWNER_REPOSITORY, useClass: PrismaOwnerRepository },
    { provide: OWNER_SEARCH, useClass: PrismaOwnerSearch },
    { provide: ANONYMIZATION, useClass: PrismaAnonymization },
    { provide: OWNER_AUTHORSHIP, useClass: PrismaOwnerAuthorship },
    {
      provide: AnonymizeOwner,
      useFactory: (a: AnonymizationPort, c: Clock, m: Metrics) => new AnonymizeOwner(a, c, m),
      inject: [ANONYMIZATION, CLOCK, METRICS],
    },
    {
      provide: SearchOwners,
      useFactory: (s: OwnerSearchPort) => new SearchOwners(s),
      inject: [OWNER_SEARCH],
    },
    {
      provide: RegisterOwner,
      useFactory: (r: OwnerRepository, c: Clock, m: Metrics) => new RegisterOwner(r, c, m),
      inject: [OWNER_REPOSITORY, CLOCK, METRICS],
    },
    {
      provide: ChangeOwnerContact,
      useFactory: (r: OwnerRepository, c: Clock, m: Metrics) => new ChangeOwnerContact(r, c, m),
      inject: [OWNER_REPOSITORY, CLOCK, METRICS],
    },
    { provide: GetOwner, useFactory: (r: OwnerRepository) => new GetOwner(r), inject: [OWNER_REPOSITORY] },
    {
      provide: GetAuthorship,
      useFactory: (r: OwnerAuthorshipReader) => new GetAuthorship(r),
      inject: [OWNER_AUTHORSHIP],
    },
  ],
  exports: [OWNER_REPOSITORY],
})
export class OwnersModule {}
