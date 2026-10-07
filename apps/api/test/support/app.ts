import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';
import { CLOCK, FixedClock } from '../../src/shared/domain/clock';

export interface TestApp {
  app: INestApplication;
  clock: FixedClock;
  http: ReturnType<INestApplication['getHttpServer']>;
  close(): Promise<void>;
}

/** Sobe a API inteira contra o Postgres do teste, com o relógio controlado. */
export async function bootApp(now = '2026-10-07T12:00:00-03:00'): Promise<TestApp> {
  const clock = FixedClock.at(now);
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CLOCK)
    .useValue(clock)
    .compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  return { app, clock, http: app.getHttpServer(), close: () => app.close() };
}

/** Cabeçalho de idempotência de um envio de formulário (D16, P-25). */
export function idem(): { 'Idempotency-Key': string } {
  return { 'Idempotency-Key': `test-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}` };
}
