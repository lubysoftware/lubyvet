import { Module } from '@nestjs/common';
import { CLOCK, type Clock } from '../../shared/domain/clock';
import { ChangeOwnerContact } from './application/change-owner-contact.use-case';
import { GetOwner } from './application/get-owner.use-case';
import { OWNER_REPOSITORY, type OwnerRepository } from './application/ports/owner-repository.port';
import { RegisterOwner } from './application/register-owner.use-case';
import { OWNER_SEARCH, type OwnerSearchPort } from './application/ports/owner-search.port';
import { SearchOwners } from './application/search-owners.use-case';
import { PrismaOwnerSearch } from './infra/prisma-owner-search';
import { PrismaOwnerRepository } from './infra/prisma-owner.repository';
import { OwnersController } from './interface/http/owners.controller';

@Module({
  controllers: [OwnersController],
  providers: [
    { provide: OWNER_REPOSITORY, useClass: PrismaOwnerRepository },
    { provide: OWNER_SEARCH, useClass: PrismaOwnerSearch },
    {
      provide: SearchOwners,
      useFactory: (s: OwnerSearchPort) => new SearchOwners(s),
      inject: [OWNER_SEARCH],
    },
    {
      provide: RegisterOwner,
      useFactory: (r: OwnerRepository, c: Clock) => new RegisterOwner(r, c),
      inject: [OWNER_REPOSITORY, CLOCK],
    },
    {
      provide: ChangeOwnerContact,
      useFactory: (r: OwnerRepository, c: Clock) => new ChangeOwnerContact(r, c),
      inject: [OWNER_REPOSITORY, CLOCK],
    },
    { provide: GetOwner, useFactory: (r: OwnerRepository) => new GetOwner(r), inject: [OWNER_REPOSITORY] },
  ],
  exports: [OWNER_REPOSITORY],
})
export class OwnersModule {}
