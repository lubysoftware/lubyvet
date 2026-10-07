import { Module } from '@nestjs/common';
import { OwnersModule } from './modules/owners/owners.module';
import { SharedModule } from './shared/infra/shared.module';

@Module({ imports: [SharedModule, OwnersModule] })
export class AppModule {}
