import { Module } from '@nestjs/common';
import { ListVetPatients } from './application/list-vet-patients.use-case';
import {
  VET_CATALOG_CACHE,
  VET_CATALOG_READER,
  VET_PATIENTS_READER,
  type VetCatalogCache,
  type VetCatalogReader,
  type VetPatientsReader,
} from './application/ports/vet-catalog.port';
import { GetVetCatalog } from './application/vet-catalog.use-case';
import { PrismaVetCatalogReader } from './infra/prisma-vet-catalog.reader';
import { PrismaVetPatients } from './infra/prisma-vet-patients';
import { RedisVetCatalogCache } from './infra/redis-vet-catalog.cache';
import { VetsController } from './interface/http/vets.controller';

@Module({
  controllers: [VetsController],
  providers: [
    { provide: VET_PATIENTS_READER, useClass: PrismaVetPatients },
    { provide: VET_CATALOG_READER, useClass: PrismaVetCatalogReader },
    { provide: VET_CATALOG_CACHE, useClass: RedisVetCatalogCache },
    {
      provide: GetVetCatalog,
      useFactory: (r: VetCatalogReader, c: VetCatalogCache) => new GetVetCatalog(r, c),
      inject: [VET_CATALOG_READER, VET_CATALOG_CACHE],
    },
    {
      provide: ListVetPatients,
      useFactory: (r: VetPatientsReader) => new ListVetPatients(r),
      inject: [VET_PATIENTS_READER],
    },
  ],
  exports: [VET_CATALOG_CACHE],
})
export class VetsModule {}
