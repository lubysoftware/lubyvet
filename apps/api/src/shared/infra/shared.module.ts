import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CLOCK } from '../domain/clock';
import { METRICS } from '../domain/metrics';
import { IdempotencyInterceptor } from '../interface/http/idempotency.interceptor';
import { IdempotencyStore } from './idempotency.store';
import { PrismaService } from './prisma.service';
import { OtelMetrics } from './otel-metrics';
import { SystemClock } from './system-clock';

@Global()
@Module({
  providers: [
    PrismaService,
    IdempotencyStore,
    { provide: CLOCK, useClass: SystemClock },
    { provide: METRICS, useClass: OtelMetrics },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
  exports: [PrismaService, CLOCK, METRICS],
})
export class SharedModule {}
