import { Module } from '@nestjs/common';
import { VET_CATALOG_CACHE, type VetCatalogCache } from '../vets/application/ports/vet-catalog.port';
import { VetsModule } from '../vets/vets.module';
import { VOCABULARY_REPOSITORY, type VocabularyRepository } from './application/ports/vocabulary.port';
import { Vocabularies } from './application/vocabularies.use-cases';
import { PrismaVocabularyRepository } from './infra/prisma-vocabulary.repository';
import { AdminController } from './interface/http/admin.controller';

@Module({
  imports: [VetsModule],
  controllers: [AdminController],
  providers: [
    { provide: VOCABULARY_REPOSITORY, useClass: PrismaVocabularyRepository },
    {
      provide: Vocabularies,
      useFactory: (r: VocabularyRepository, c: VetCatalogCache) => new Vocabularies(r, c),
      inject: [VOCABULARY_REPOSITORY, VET_CATALOG_CACHE],
    },
  ],
})
export class VocabulariesModule {}
