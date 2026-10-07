import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CLOCK } from '../domain/clock';
import { DOMAIN_EVENTS } from '../domain/events';
import { METRICS } from '../domain/metrics';
import { IdempotencyInterceptor } from '../interface/http/idempotency.interceptor';
import { IdempotencyStore } from './idempotency.store';
import { PrismaService } from './prisma.service';
import { InProcessEvents } from './in-process-events';
import { OtelMetrics } from './otel-metrics';
import { SystemClock } from './system-clock';

@Global()
@Module({
  providers: [
    PrismaService,
    IdempotencyStore,
    { provide: CLOCK, useClass: SystemClock },
    { provide: METRICS, useClass: OtelMetrics },
    InProcessEvents,
    { provide: DOMAIN_EVENTS, useExisting: InProcessEvents },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
  exports: [PrismaService, CLOCK, METRICS, DOMAIN_EVENTS, InProcessEvents],
})
export class SharedModule {}
