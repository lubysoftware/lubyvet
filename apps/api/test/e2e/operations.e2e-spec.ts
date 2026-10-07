import { DomainErrorFilter } from '../../src/shared/interface/http/domain-error.filter';
import { maskSecrets, REDACTED_PATHS } from '../../src/shared/infra/logger';
import { ROUTE_ROLES } from '../../src/shared/interface/http/roles';
import { OWNER_PET_ROUTES } from '../../src/shared/interface/http/route-inventory';
import request from 'supertest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { bootApp, idem, loginAs, type TestApp } from '../support/app';
import { testDb } from '../support/test-db';

// 008: T004, T007, T012, T013, T014, T015, T017, T019.
describe('operação, erros e observabilidade', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  it.each(OWNER_PET_ROUTES.map((r) => [`${r.method.toUpperCase()} ${r.path}`, r] as const))(
    'T004: %s com identificador inexistente responde 404, nunca 500',
    async (_l, r) => {
      const res = await t.api[r.method](r.path.replace(/:\w+/g, '999999')).set(idem()).send({
        version: 0,
        scheduledAt: '2026-12-01T10:00:00-03:00',
        description: 'x',
        date: '2026-10-07',
        chiefComplaint: 'x',
      });
      expect(res.status).toBe(404);
    },
  );

  it('T007: falha inesperada vira 500 com um identificador de ocorrência, sem detalhe interno', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    new DomainErrorFilter().catch(new Error('segredo interno'), {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as never);
    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0]?.[0] as { error: { code: string; occurrenceId: string } };
    expect(body.error.code).toBe('internal_error');
    expect(body.error.occurrenceId).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(body)).not.toContain('segredo');
  });

  it('T012: as sondas respondem sem credencial e só o estado agregado (D03)', async () => {
    expect((await request(t.http).get('/api/health/live').expect(200)).body).toEqual({ status: 'up' });
    expect((await request(t.http).get('/api/health/ready').expect(200)).body).toEqual({ status: 'up' });
  });

  it('T013: o log remove dado pessoal e mascara credencial em URL', () => {
    for (const f of ['*.cpf', '*.telephone', '*.email', '*.firstName', 'req.headers.cookie'])
      expect(REDACTED_PATHS).toContain(f);
    expect(maskSecrets('postgresql://lubyvet:s3nh4@db:5432/x')).toBe('postgresql://lubyvet:***@db:5432/x');
  });

  it('T014/T015: nenhum caminho de falha deliberada nem console de banco é servido', async () => {
    for (const path of ['/oups', '/api/oups', '/api/crash', '/h2-console', '/api/h2-console'])
      expect((await t.api.get(path)).status).toBe(404);
  });

  it('T019, T010: cada caminho de gestão recusa sem credencial e com papel Escrita; só as sondas são públicas', async () => {
    const mgmt = Object.keys(ROUTE_ROLES).filter((k) => k.startsWith('GET /api/admin/'));
    const writer = await loginAs(t.http, 'writer');
    for (const key of mgmt) {
      const path = (key.split(' ')[1] ?? '').replace(/:\w+/g, '1');
      expect((await request(t.http).get(path)).status).toBe(401);
      expect((await request(t.http).get(path).set('Cookie', writer)).status).toBe(403);
    }
    expect(
      Object.entries(ROUTE_ROLES)
        .filter(([, v]) => v === 'public')
        .map(([k]) => k),
    ).toEqual(['POST /api/session', 'GET /api/health/live', 'GET /api/health/ready']);
    expect((await t.api.get('/api/admin/metrics').expect(200)).body).toMatchObject({
      owners: 0,
      pendingRecord: 0,
    });
  });

  it('T017: um dialeto só e nenhum arquivo de esquema fora das migrações (P5)', () => {
    const root = join(__dirname, '../..');
    expect(readFileSync(join(root, 'prisma/schema.prisma'), 'utf8')).toMatch(/provider = "postgresql"/);
    expect(readdirSync(join(root, 'prisma')).filter((f) => f.endsWith('.sql'))).toEqual([]);
  });
});
