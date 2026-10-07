import { Module } from '@nestjs/common';
import { Operations } from './application/operations.use-cases';
import { OPS_READER, type OpsReader } from './application/ports/ops.port';
import { OtelGauges } from './infra/otel-gauges';
import { PrismaOpsReader } from './infra/prisma-ops.reader';
import { AdminOpsController } from './interface/http/admin-ops.controller';
import { HealthController } from './interface/http/health.controller';

@Module({
  controllers: [HealthController, AdminOpsController],
  providers: [
    { provide: OPS_READER, useClass: PrismaOpsReader },
    { provide: Operations, useFactory: (o: OpsReader) => new Operations(o), inject: [OPS_READER] },
    OtelGauges,
  ],
})
export class OperationsModule {}
