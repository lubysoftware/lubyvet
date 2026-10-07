import { Module } from '@nestjs/common';
import { OwnersModule } from './modules/owners/owners.module';
import { PetsModule } from './modules/pets/pets.module';
import { VetsModule } from './modules/vets/vets.module';
import { VisitsModule } from './modules/visits/visits.module';
import { SharedModule } from './shared/infra/shared.module';

@Module({ imports: [SharedModule, OwnersModule, PetsModule, VisitsModule, VetsModule] })
export class AppModule {}
