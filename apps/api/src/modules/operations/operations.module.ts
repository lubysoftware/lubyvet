import { Module } from '@nestjs/common';
import { OPS_READER } from './application/ports/ops.port';
import { PrismaOpsReader } from './infra/prisma-ops.reader';
import { AdminOpsController } from './interface/http/admin-ops.controller';
import { HealthController } from './interface/http/health.controller';

@Module({
  controllers: [HealthController, AdminOpsController],
  providers: [{ provide: OPS_READER, useClass: PrismaOpsReader }],
})
export class OperationsModule {}
