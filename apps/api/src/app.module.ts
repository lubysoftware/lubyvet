import { Module } from '@nestjs/common';
import { IdentityModule } from './modules/identity/identity.module';
import { OwnersModule } from './modules/owners/owners.module';
import { PetsModule } from './modules/pets/pets.module';
import { VetsModule } from './modules/vets/vets.module';
import { VocabulariesModule } from './modules/vocabularies/vocabularies.module';
import { VisitsModule } from './modules/visits/visits.module';
import { SharedModule } from './shared/infra/shared.module';

@Module({
  imports: [
    SharedModule,
    IdentityModule,
    OwnersModule,
    PetsModule,
    VisitsModule,
    VetsModule,
    VocabulariesModule,
  ],
})
export class AppModule {}
