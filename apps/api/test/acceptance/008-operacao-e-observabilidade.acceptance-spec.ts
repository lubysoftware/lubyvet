import { metrics } from '@opentelemetry/api';
import { MeterProvider, MetricReader, type ResourceMetrics } from '@opentelemetry/sdk-metrics';
import request from 'supertest';
import { anOwnerInput } from '../builders/owner.builder';
import {
  OWNER_REPOSITORY,
  type OwnerRepository,
} from '../../src/modules/owners/application/ports/owner-repository.port';
import { OPS_READER, type OpsReader } from '../../src/modules/operations/application/ports/ops.port';
import { logger, maskSecrets } from '../../src/shared/infra/logger';
import { ROUTE_ROLES } from '../../src/shared/interface/http/roles';
import { bootApp, idem, loginAs, type TestApp } from '../support/app';
import { aPetInput, postPet } from '../support/pets';
import { listRepo, readRepo } from '../support/structural';
import { testDb } from '../support/test-db';

/** Leitor de métricas em memória: o mesmo OpenTelemetry da produção, sem exportador. */
class TestReader extends MetricReader {
  protected onForceFlush(): Promise<void> {
    return Promise.resolve();
  }
  protected onShutdown(): Promise<void> {
    return Promise.resolve();
  }
}
const reader = new TestReader();
metrics.setGlobalMeterProvider(new MeterProvider({ readers: [reader] }));

const PERSONAL = /Mariana|Teixeira|52998224725|98765|@clinica|Rua Secreta/;
const withId = Object.keys(ROUTE_ROLES).filter((k) => k.includes('/:'));
const body = {
  version: 0,
  name: 'X',
  scheduledAt: '2026-12-01T10:00:00-03:00',
  description: 'x',
  date: '2026-10-07',
  chiefComplaint: 'x',
  birthDate: '2020-01-01',
  speciesId: 2,
  spans: [],
};

async function collected(): Promise<Map<string, { value: number; attributes: Record<string, unknown> }[]>> {
  const { resourceMetrics } = (await reader.collect()) as { resourceMetrics: ResourceMetrics };
  const out = new Map<string, { value: number; attributes: Record<string, unknown> }[]>();
  for (const scope of resourceMetrics.scopeMetrics)
    for (const m of scope.metrics)
      out.set(
        m.descriptor.name,
        m.dataPoints.map((p) => ({
          value: Number(p.value),
          attributes: p.attributes as Record<string, unknown>,
        })),
      );
  return out;
}

describe('008 Operação, erros e observabilidade: critérios de aceite', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp('2026-10-07T12:00:00-03:00');
  });
  beforeEach(() => testDb.truncate());
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  it('008/CA-1.1 dono ou animal inexistente responde não encontrado, nunca falha genérica', async () => {
    const o = (await t.api.post('/api/owners').set(idem()).send(anOwnerInput()).expect(201)).body;
    for (const path of [
      '/api/owners/999999',
      '/api/owners/999999/record',
      `/api/owners/${o.id}/pets/999999`,
    ]) {
      const res = await t.api.get(path);
      expect([path, res.status]).toEqual([path, 404]);
      expect(res.body.error.code).toMatch(/not_found$/);
    }
    await t.api.post(`/api/owners/${o.id}/pets/999999/appointments`).set(idem()).send(body).expect(404);
  });

  it('008/CA-1.2 a resposta de não encontrado não expõe pilha, classe nem consulta', async () => {
    const res = await t.api.get('/api/owners/999999');
    expect(res.body).toEqual({ error: { code: 'owner_not_found' } });
    expect(JSON.stringify(res.body)).not.toMatch(/select |prisma|Error\b|\bat \w+ \(/);
  });

  it('008/CA-1.3 o identificador inexistente provoca uma busca só', async () => {
    const owners = t.app.get<OwnerRepository>(OWNER_REPOSITORY);
    const spy = jest.spyOn(owners, 'findById');
    await t.api.get('/api/owners/999999').expect(404);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('008/CA-1.4 cada caminho que recebe identificador responde 404 a um inexistente', async () => {
    for (const key of withId) {
      const [method, path] = key.split(' ') as [string, string];
      const res = await t.api[method.toLowerCase() as 'get'](path.replace(/:\w+/g, '999999'))
        .set(idem())
        .send(body);
      expect([key, res.status]).toEqual([key, 404]);
    }
  });

  it('008/CA-2.1 a falha inesperada traz mensagem compreensível e um identificador da ocorrência', async () => {
    jest
      .spyOn(t.app.get<OwnerRepository>(OWNER_REPOSITORY), 'findById')
      .mockRejectedValue(new Error('pool exausto'));
    const res = await t.api.get('/api/owners/1');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('internal_error');
    expect(res.body.error.occurrenceId).toMatch(/^[0-9a-f-]{36}$/);
    const web = JSON.parse(readRepo('apps/web/src/i18n/messages/pt-BR.json'));
    expect(web.errors.internal_error).toContain('{occurrenceId}');
  });

  it('008/CA-2.2 a resposta da falha não tem pilha, versão, caminho de arquivo nem classe', async () => {
    jest
      .spyOn(t.app.get<OwnerRepository>(OWNER_REPOSITORY), 'findById')
      .mockRejectedValue(new TypeError('x of undefined'));
    const res = await t.api.get('/api/owners/1');
    expect(Object.keys(res.body.error).sort()).toEqual(['code', 'occurrenceId']);
    expect(JSON.stringify(res.body)).not.toMatch(/TypeError|\.ts|\/src\/|node_modules|undefined/);
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('008/CA-2.3 a falha fica no log com o mesmo identificador da resposta', async () => {
    jest.spyOn(t.app.get<OwnerRepository>(OWNER_REPOSITORY), 'findById').mockRejectedValue(new Error('x'));
    const log = jest.spyOn(logger, 'error');
    const res = await t.api.get('/api/owners/1');
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ occurrenceId: res.body.error.occurrenceId }),
      expect.any(String),
    );
  });

  it('008/CA-2.4 o teste provoca a falha e confere a ausência dos elementos internos', async () => {
    jest.spyOn(t.app.get<OwnerRepository>(OWNER_REPOSITORY), 'findById').mockImplementation(() => {
      throw new Error('segredo em /src/x.ts');
    });
    const res = await t.api.get('/api/owners/1');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/segredo|\/src\//);
  });

  it('008/CA-3.1 a vivacidade responde com a aplicação no ar e falha quando ela não atende mais', async () => {
    jest.spyOn(t.app.get<OpsReader>(OPS_READER), 'databaseUp').mockResolvedValue(false);
    expect((await request(t.http).get('/api/health/live').expect(200)).body).toEqual({ status: 'up' });
    const other = await bootApp();
    const server = other.http.listen(0);
    const port = (server.address() as { port: number }).port;
    expect((await fetch(`http://127.0.0.1:${port}/api/health/live`)).status).toBe(200);
    server.close();
    await other.close();
    await expect(fetch(`http://127.0.0.1:${port}/api/health/live`)).rejects.toThrow();
  });

  it('008/CA-3.2 a prontidão só é positiva com o banco acessível', async () => {
    await request(t.http).get('/api/health/ready').expect(200);
    jest.spyOn(t.app.get<OpsReader>(OPS_READER), 'databaseUp').mockResolvedValue(false);
    expect((await request(t.http).get('/api/health/ready').expect(503)).body).toEqual({ status: 'down' });
  });

  it('008/CA-3.3 as sondas não pedem identificação e só dizem o estado agregado', async () => {
    for (const p of ['/api/health/live', '/api/health/ready'])
      expect(Object.keys((await request(t.http).get(p).expect(200)).body)).toEqual(['status']);
  });

  it('008/CA-3.4 as duas sondas estão no manifesto com os tempos de P-16', () => {
    const tpl = readRepo('deploy/helm/lubyvet/templates/api.yaml');
    expect(tpl).toMatch(/livenessProbe: \{ httpGet: \{ path: \/api\/health\/live/);
    expect(tpl).toMatch(/readinessProbe: \{ httpGet: \{ path: \/api\/health\/ready/);
    const values = readRepo('deploy/helm/lubyvet/values.yaml');
    expect(values).toMatch(
      /liveness:\s*\{?\s*timeoutSeconds: 1,?\s*periodSeconds: 10,?\s*failureThreshold: 3/,
    );
    expect(values).toMatch(/readiness:\s*\{?\s*timeoutSeconds: 2/);
  });

  it('008/CA-4.1 os caminhos de gestão exigem identificação e papel de Administrador', async () => {
    const writer = await loginAs(t.http, 'writer');
    for (const key of Object.keys(ROUTE_ROLES).filter((k) => k.includes('/api/admin/'))) {
      const [method, path] = key.split(' ') as [string, string];
      const m = method.toLowerCase() as 'get';
      const url = path.replace(/:\w+/g, '1');
      expect([key, (await request(t.http)[m](url).set(idem())).status]).toEqual([key, 401]);
      expect([key, (await request(t.http)[m](url).set('Cookie', writer).set(idem())).status]).toEqual([
        key,
        403,
      ]);
    }
  });

  it('008/CA-4.2 só as sondas ficam abertas e respondem só o estado', () => {
    const open = Object.entries(ROUTE_ROLES)
      .filter(([, v]) => v === 'public')
      .map(([k]) => k);
    expect(open).toEqual(['POST /api/session', 'GET /api/health/live', 'GET /api/health/ready']);
  });

  it('008/CA-4.3 cada caminho de gestão pedido sem credencial é recusado', async () => {
    for (const path of ['/api/admin/info', '/api/admin/metrics', '/api/admin/species', '/api/admin/vets'])
      expect((await request(t.http).get(path)).status).toBe(401);
  });

  it('008/CA-4.4 nenhum valor de credencial sai em resposta ou log', async () => {
    const info = JSON.stringify((await t.api.get('/api/admin/info').expect(200)).body);
    const dbUrl = process.env.DATABASE_URL ?? '';
    const password = `:${new URL(dbUrl).password}@`;
    expect(info).not.toContain(dbUrl);
    expect(maskSecrets(`conectando em ${dbUrl}`)).not.toContain(password);
    expect(maskSecrets(`conectando em ${dbUrl}`)).toContain(':***@');
    const lines: unknown[] = [];
    jest.spyOn(logger, 'info').mockImplementation((o: unknown) => void lines.push(o));
    await t.api.post('/api/owners').set(idem()).send(anOwnerInput()).expect(201);
    expect(JSON.stringify(lines)).not.toContain(password);
  });

  it('008/CA-5.1 toda falha inesperada registra momento, caminho e ocorrência', async () => {
    jest.spyOn(t.app.get<OwnerRepository>(OWNER_REPOSITORY), 'findById').mockRejectedValue(new Error('x'));
    const log = jest.spyOn(logger, 'error');
    await t.api.get('/api/owners/42?lastName=Teixeira');
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/api/owners/42', occurrenceId: expect.any(String) }),
      expect.any(String),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('Teixeira');
  });

  it('008/CA-5.2 as escritas de dono, animal e visita ficam no log com resultado', async () => {
    const lines: Record<string, unknown>[] = [];
    jest
      .spyOn(logger, 'info')
      .mockImplementation((o: unknown) => void lines.push(o as Record<string, unknown>));
    const o = (await t.api.post('/api/owners').set(idem()).send(anOwnerInput()).expect(201)).body;
    const p = (await postPet(t, o.id, aPetInput()).expect(201)).body;
    await t.api
      .post(`/api/owners/${o.id}/pets/${p.id}/appointments`)
      .set(idem())
      .send({ scheduledAt: '2026-01-01T10:00:00Z', description: 'x' });
    expect(lines.map((l) => [l.method, l.path, l.status])).toEqual([
      ['POST', '/api/owners', 201],
      ['POST', `/api/owners/${o.id}/pets`, 201],
      ['POST', `/api/owners/${o.id}/pets/${p.id}/appointments`, 422],
    ]);
  });

  it('008/CA-5.3 o log não leva dado pessoal nem credencial', async () => {
    const lines: unknown[] = [];
    jest.spyOn(logger, 'info').mockImplementation((o: unknown) => void lines.push(o));
    jest.spyOn(logger, 'error').mockImplementation((o: unknown) => void lines.push(o));
    await t.api
      .post('/api/owners')
      .set(idem())
      .send(
        anOwnerInput({
          firstName: 'Mariana',
          lastName: 'Teixeira',
          address: 'Rua Secreta',
          email: 'm@clinica.com',
        }),
      )
      .expect(201);
    await t.api.get('/api/owners?lastName=Teixeira').expect(200);
    expect(JSON.stringify(lines)).not.toMatch(PERSONAL);
  });

  it('008/CA-5.4 as métricas de D27 saem por OpenTelemetry, sem dado pessoal em valor nem rótulo', async () => {
    const vet = (
      await t.api.post('/api/admin/vets').set(idem()).send({ firstName: 'Helena', lastName: 'Costa' })
    ).body;
    const o = (
      await t.api
        .post('/api/owners')
        .set(idem())
        .send(anOwnerInput({ firstName: 'Mariana', lastName: 'Teixeira' }))
    ).body;
    await t.api
      .post('/api/owners')
      .set(idem())
      .send(anOwnerInput({ telephone: o.telephone }))
      .expect(409);
    const p = (await postPet(t, o.id, aPetInput())).body;
    const base = `/api/owners/${o.id}/pets/${p.id}`;
    const a = (
      await t.api
        .post(`${base}/appointments`)
        .set(idem())
        .send({ scheduledAt: '2026-10-20T10:00:00-03:00', description: 'x' })
    ).body;
    await t.api.post(`${base}/appointments/${a.id}/cancel`).set(idem()).send({ version: 0 }).expect(200);
    await t.api
      .post(`${base}/encounters`)
      .set(idem())
      .send({ date: '2026-10-07', chiefComplaint: 'x', vetId: vet.id, returnDate: '2026-11-01' })
      .expect(201);
    await t.api.post(`/api/owners/${o.id}/anonymize`).set(idem()).send({}).expect(200);

    const m = await collected();
    const total = (name: string) => (m.get(name) ?? []).reduce((n, p) => n + p.value, 0);
    expect(total('lubyvet_owners_created')).toBeGreaterThanOrEqual(1);
    expect(total('lubyvet_similar_owner_shown')).toBeGreaterThanOrEqual(1);
    expect(total('lubyvet_pets_created')).toBeGreaterThanOrEqual(1);
    expect(total('lubyvet_appointments_created')).toBeGreaterThanOrEqual(1);
    expect(total('lubyvet_appointments_cancelled')).toBeGreaterThanOrEqual(1);
    expect(total('lubyvet_returns_suggested')).toBeGreaterThanOrEqual(1);
    expect(total('lubyvet_owners_anonymized')).toBeGreaterThanOrEqual(1);
    expect(m.get('lubyvet_encounters_recorded')?.some((p) => p.attributes.vet_id === String(vet.id))).toBe(
      true,
    );
    for (const g of [
      'lubyvet_appointments_pending_record',
      'lubyvet_no_show_rate_percent',
      'lubyvet_whatsapp_queue_size',
    ])
      expect(m.has(g)).toBe(true);
    const everything = JSON.stringify([...m.entries()]);
    expect(everything).not.toMatch(/Mariana|Teixeira|Helena|Costa|\+55|@/);
    expect(readRepo('deploy/grafana/lubyvet-d27.json')).toContain('lubyvet_encounters_recorded_total');
  });

  it('008/CA-6.1 nenhum caminho provoca falha deliberada', async () => {
    for (const path of ['/oups', '/api/oups', '/api/crash', '/api/error', '/api/fail'])
      expect((await t.api.get(path)).status).toBe(404);
    expect(Object.keys(ROUTE_ROLES).filter((k) => /oups|crash|fail|error/i.test(k))).toEqual([]);
  });

  it('008/CA-7.1 nenhum console de banco é servido, em perfil algum', async () => {
    for (const path of ['/h2-console', '/api/h2-console', '/pgadmin', '/api/db', '/adminer', '/api/console'])
      expect((await t.api.get(path)).status).toBe(404);
  });

  it('008/CA-7.2 nenhuma dependência de console de banco no que se publica', () => {
    const deps = (p: string) => {
      const pkg = JSON.parse(readRepo(p));
      return Object.keys({ ...pkg.dependencies });
    };
    const all = [...deps('apps/api/package.json'), ...deps('apps/web/package.json')];
    expect(all.filter((d) => /h2|pgadmin|adminer|prisma-studio|@prisma\/studio|phpmyadmin/i.test(d))).toEqual(
      [],
    );
  });

  it('008/CA-8.1 um banco homologado e um conjunto só de definição de esquema', () => {
    expect(readRepo('apps/api/prisma/schema.prisma')).toMatch(/provider = "postgresql"/);
    const prisma = listRepo('apps/api/prisma');
    expect(prisma.filter((f) => f.endsWith('.prisma'))).toEqual(['apps/api/prisma/schema.prisma']);
    expect(prisma.filter((f) => f.endsWith('.sql'))).toEqual([]);
  });

  it('008/CA-8.2 o esquema evolui por migração versionada, aplicada no teste', async () => {
    const migrations = listRepo('apps/api/prisma/migrations')
      .map((f) => f.split('/').pop() ?? '')
      .filter((f) => /^\d{14}_/.test(f));
    const { rows } = await testDb.sql.query<{ migration_name: string }>(
      'select migration_name from _prisma_migrations where finished_at is not null order by migration_name',
    );
    expect(rows.map((r) => r.migration_name)).toEqual(migrations.sort());
    expect(listRepo('apps/api/test/integration')).toContain(
      'apps/api/test/integration/schema-drift.int-spec.ts',
    );
  });

  it('008/CA-8.3 nenhuma regra muda conforme o banco: as regras sensíveis a dialeto valem no banco homologado', async () => {
    // P-05: um banco só. As regras que no legado mudavam de dialeto para dialeto (caixa, acento,
    // unicidade com LOWER) são provadas aqui, no PostgreSQL em que a aplicação roda.
    const { rows } = await testDb.sql.query<{ v: string }>('select version() as v');
    expect(rows[0]?.v).toMatch(/^PostgreSQL 17/);
    const a = (
      await t.api
        .post('/api/owners')
        .set(idem())
        .send(anOwnerInput({ lastName: 'Évora' }))
        .expect(201)
    ).body;
    for (const q of ['évo', 'ÉVO', 'Évo'])
      expect((await t.api.get(`/api/owners?lastName=${encodeURIComponent(q)}`)).body.total).toBe(1);
    await postPet(t, a.id, aPetInput({ name: 'Ágata' })).expect(201);
    expect((await postPet(t, a.id, aPetInput({ name: 'ÁGATA' })).expect(422)).body.error.fields).toEqual([
      { path: 'name', code: 'pet_name_taken' },
    ]);
  });
});
