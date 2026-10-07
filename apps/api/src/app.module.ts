import { Module } from '@nestjs/common';
import { OwnersModule } from './modules/owners/owners.module';
import { PetsModule } from './modules/pets/pets.module';
import { SharedModule } from './shared/infra/shared.module';

@Module({ imports: [SharedModule, OwnersModule, PetsModule] })
export class AppModule {}
