import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { testDb } from './test-db';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';
import { CLOCK, FixedClock } from '../../src/shared/domain/clock';

export interface TestApp {
  app: INestApplication;
  clock: FixedClock;
  http: ReturnType<INestApplication['getHttpServer']>;
  /** Cliente HTTP já identificado como administrador (D04: tudo exige login). */
  api: ReturnType<typeof request.agent>;
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
  const http = app.getHttpServer();
  await testDb.seedUsers();
  const cookie = await loginAs(http, 'admin');
  const api = request.agent(http).set('Cookie', cookie);
  return { app, clock, http, api, close: () => app.close() };
}

export type RoleName = 'admin' | 'writer' | 'reader';

/** Entra com o usuário de teste do papel e devolve o cookie de sessão. */
export async function loginAs(http: TestApp['http'], role: RoleName): Promise<string> {
  const res = await request(http)
    .post('/api/session')
    .send({ login: `${role}@lubyvet.test`, password: 'senha-de-teste-123' })
    .expect(200);
  const set = res.headers['set-cookie'] as unknown as string[];
  return (set[0] ?? '').split(';')[0] ?? '';
}

/** Cabeçalho de idempotência de um envio de formulário (D16, P-25). */
export function idem(): { 'Idempotency-Key': string } {
  return { 'Idempotency-Key': `test-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}` };
}
