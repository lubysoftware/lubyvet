import Redis from 'ioredis';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { anOwnerInput } from '../builders/owner.builder';
import { ROUTE_ROLES } from '../../src/shared/interface/http/roles';
import { PERSONAL_DATA_ROUTES } from '../../src/shared/interface/http/route-inventory';
import { bootApp, idem, loginAs, type TestApp } from '../support/app';
import { aPetInput, postPet } from '../support/pets';
import { testDb } from '../support/test-db';

const url = (path: string) => path.replace(/:\w+/g, '1');
const writes = Object.entries(ROUTE_ROLES)
  .filter(([k, v]) => v !== 'public' && !k.startsWith('GET') && !k.includes('/session'))
  .map(([k, v]) => [k, v] as const);

describe('007 Acesso, identidade e dados pessoais: critérios de aceite', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp('2026-10-07T12:00:00-03:00');
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  /** Dono com animal, uma visita e um atendimento que citam o nome e o celular dele. */
  async function ownerWithHistory() {
    const o = (
      await t.api
        .post('/api/owners')
        .set(idem())
        .send(
          anOwnerInput({
            firstName: 'Mariana',
            lastName: 'Teixeira',
            address: 'Rua Secreta, 9',
            telephone: '(11) 98765-4321',
          }),
        )
        .expect(201)
    ).body;
    const p = (await postPet(t, o.id, aPetInput()).expect(201)).body;
    const base = `/api/owners/${o.id}/pets/${p.id}`;
    await t.api
      .post(`${base}/appointments`)
      .set(idem())
      .send({ scheduledAt: '2026-10-10T09:00:00-03:00', description: 'Ligar para Mariana' })
      .expect(201);
    await t.api
      .post(`${base}/encounters`)
      .set(idem())
      .send({ date: '2026-10-07', chiefComplaint: 'Tosse', conduct: 'Avisar Teixeira no 11 98765-4321' })
      .expect(201);
    return { o, p, base };
  }

  it('007/CA-1.1 todo caminho com dado pessoal exige identificação', async () => {
    for (const r of PERSONAL_DATA_ROUTES) {
      const res = await request(t.http)[r.method](url(r.path)).set(idem()).send({});
      expect([r.path, res.status]).toEqual([r.path, 401]);
    }
  });

  it('007/CA-1.2 credencial errada recebe erro genérico, sem revelar se o usuário existe', async () => {
    const known = await request(t.http)
      .post('/api/session')
      .send({ login: 'admin@lubyvet.test', password: 'x' });
    const unknown = await request(t.http)
      .post('/api/session')
      .send({ login: 'ninguem@x.test', password: 'x' });
    expect([known.status, unknown.status]).toEqual([401, 401]);
    expect(known.body).toEqual(unknown.body);
    expect(known.body).toEqual({ error: { code: 'invalid_credentials' } });
  });

  it('007/CA-1.3 a sessão expira após o tempo de inatividade (D19: 8 horas)', async () => {
    const cookie = await loginAs(t.http, 'reader');
    const token = decodeURIComponent(cookie.split('=')[1] ?? '');
    const redis = new Redis(process.env.REDIS_URL ?? '');
    const ttl = await redis.ttl(`lubyvet:session:${token}`);
    expect(ttl).toBeGreaterThan(8 * 3600 - 60);
    expect(ttl).toBeLessThanOrEqual(8 * 3600);
    await redis.del(`lubyvet:session:${token}`);
    redis.disconnect();
    expect((await request(t.http).get('/api/owners').set('Cookie', cookie)).status).toBe(401);
  });

  it('007/CA-1.4 o acesso anônimo é testado para cada caminho do inventário de dado pessoal', () => {
    const inventoried = new Set(PERSONAL_DATA_ROUTES.map((r) => `${r.method.toUpperCase()} ${r.path}`));
    const personal = Object.keys(ROUTE_ROLES).filter(
      (k) => /\/api\/owners/.test(k) && !/anonymize|free-text|authorship/.test(k),
    );
    expect(personal.filter((k) => !inventoried.has(k))).toEqual([]);
  });

  it('007/CA-2.1 as ações de cada papel estão declaradas num lugar só: toda rota dos controllers está na matriz', () => {
    const src = join(__dirname, '../../src/modules');
    const controllers = readdirSync(src, { recursive: true, encoding: 'utf8' }).filter((f) =>
      f.endsWith('.controller.ts'),
    );
    const declared: string[] = [];
    for (const f of controllers) {
      const code = readFileSync(join(src, f), 'utf8');
      const prefix = /@Controller\((?:'([^']*)')?\)/.exec(code)?.[1] ?? '';
      for (const m of code.matchAll(/@(Get|Post|Patch|Put|Delete)\((?:'([^']*)')?\)/g)) {
        const path = ['/api', prefix, m[2] ?? ''].filter(Boolean).join('/').replace(/\/+/g, '/');
        declared.push(`${(m[1] ?? '').toUpperCase()} ${path}`);
      }
    }
    expect(declared.length).toBeGreaterThan(30);
    expect(declared.filter((k) => !(k in ROUTE_ROLES)).sort()).toEqual([]);
    expect(
      Object.keys(ROUTE_ROLES)
        .filter((k) => !declared.includes(k))
        .sort(),
    ).toEqual([]);
    // Nenhum controller decide papel por conta própria; a única leitura do papel fora da matriz é a
    // do D09 (quem volta um animal para Ativo), entregue ao domínio como dado.
    const roleChecks = controllers.filter((f) => /role\s*===/.test(readFileSync(join(src, f), 'utf8')));
    expect(roleChecks).toEqual([join('pets', 'interface', 'http', 'pets.controller.ts')]);
  });

  it('007/CA-2.2 ação fora do papel é recusada sem revelar se o dado existe', async () => {
    const { o } = await ownerWithHistory();
    const writer = await loginAs(t.http, 'writer');
    const existing = await request(t.http)
      .post(`/api/owners/${o.id}/anonymize`)
      .set('Cookie', writer)
      .set(idem());
    const missing = await request(t.http)
      .post('/api/owners/999999/anonymize')
      .set('Cookie', writer)
      .set(idem());
    expect([existing.status, missing.status]).toEqual([403, 403]);
    expect(existing.body).toEqual(missing.body);
  });

  it('007/CA-2.3 cada caminho de escrita tem teste de papel', async () => {
    const reader = await loginAs(t.http, 'reader');
    const writer = await loginAs(t.http, 'writer');
    for (const [key, roles] of writes) {
      const [method, path] = key.split(' ') as [string, string];
      const m = method.toLowerCase() as 'post';
      expect([
        key,
        (await request(t.http)[m](url(path)).set('Cookie', reader).set(idem()).send({})).status,
      ]).toEqual([key, 403]);
      if (!roles.includes('writer'))
        expect([
          key,
          (await request(t.http)[m](url(path)).set('Cookie', writer).set(idem()).send({})).status,
        ]).toEqual([key, 403]);
    }
  });

  it('007/CA-3.1 o próprio sistema anonimiza os dados pessoais de um dono', async () => {
    const { o } = await ownerWithHistory();
    await t.api.post(`/api/owners/${o.id}/anonymize`).set(idem()).send({}).expect(200);
    expect((await t.api.get(`/api/owners/${o.id}`)).body).toMatchObject({
      firstName: 'Dono',
      lastName: 'anonimizado',
    });
  });

  it('007/CA-3.2 nenhum caminho de leitura devolve nome, endereço ou telefone da pessoa', async () => {
    const { o, base } = await ownerWithHistory();
    await t.api.post(`/api/owners/${o.id}/anonymize`).set(idem()).send({}).expect(200);
    const items = (await t.api.get(`/api/owners/${o.id}/free-text`)).body;
    await t.api.post(`/api/owners/${o.id}/free-text/redact`).set(idem()).send({ spans: items }).expect(204);
    const reads = [
      '/api/owners',
      '/api/owners?lastName=Teix',
      `/api/owners/${o.id}`,
      `/api/owners/${o.id}/record`,
      base,
      `${base}/visits`,
    ];
    const all = (await Promise.all(reads.map(async (r) => JSON.stringify((await t.api.get(r)).body)))).join(
      ' ',
    );
    for (const secret of ['Mariana', 'Teixeira', 'Rua Secreta', '98765']) expect(all).not.toContain(secret);
  });

  it('007/CA-3.3 o histórico clínico continua, desvinculado da identificação', async () => {
    const { o, base } = await ownerWithHistory();
    await t.api.post(`/api/owners/${o.id}/anonymize`).set(idem()).send({}).expect(200);
    const v = (await t.api.get(`${base}/visits`)).body;
    expect([v.appointments.length, v.encounters.length]).toEqual([1, 1]);
    expect(v.encounters[0].chiefComplaint).toBe('Tosse');
  });

  it('007/CA-3.4 a operação fica registrada com data e com quem executou', async () => {
    const { o } = await ownerWithHistory();
    await t.api.post(`/api/owners/${o.id}/anonymize`).set(idem()).send({}).expect(200);
    const { rows } = await testDb.sql.query(
      'select anonymized_at, anonymized_by from owner_anonymizations where owner_id = $1',
      [o.id],
    );
    expect(rows[0].anonymized_by).toBe(1);
    expect(rows[0].anonymized_at).toEqual(new Date('2026-10-07T15:00:00Z'));
  });

  it('007/CA-3.5 o texto livre é revisado: só o trecho confirmado vira [removido], o resto fica intacto, e o dono fica pendente até concluir (D25)', async () => {
    const { o, base } = await ownerWithHistory();
    await t.api.post(`/api/owners/${o.id}/anonymize`).set(idem()).send({}).expect(200);
    const items = (await t.api.get(`/api/owners/${o.id}/free-text`).expect(200)).body as {
      text: string;
      start: number;
      end: number;
    }[];
    expect(items.length).toBeGreaterThanOrEqual(3);
    const pending = async () =>
      (await testDb.sql.query('select reviewed_at from owner_anonymizations where owner_id = $1', [o.id]))
        .rows[0].reviewed_at;
    expect(await pending()).toBeNull();
    // O Administrador confirma o nome na visita e deixa o resto: só o confirmado muda.
    const name = items.find((i) => i.text.slice(i.start, i.end) === 'Mariana');
    await t.api
      .post(`/api/owners/${o.id}/free-text/redact`)
      .set(idem())
      .send({ spans: [name] })
      .expect(204);
    expect(await pending()).not.toBeNull();
    expect((await t.api.get(`/api/owners/${o.id}/free-text`)).body).toEqual([]);
    const v = (await t.api.get(`${base}/visits`)).body;
    expect(v.appointments[0].description).toBe('Ligar para [removido]');
    expect(v.encounters[0].conduct).toBe('Avisar Teixeira no 11 98765-4321');
  });

  it('007/CA-4.1 toda gravação de dono, animal e visita registra quem e quando', async () => {
    const writer = await loginAs(t.http, 'writer');
    const o = (
      await request(t.http)
        .post('/api/owners')
        .set('Cookie', writer)
        .set(idem())
        .send(anOwnerInput())
        .expect(201)
    ).body;
    const p = (
      await request(t.http)
        .post(`/api/owners/${o.id}/pets`)
        .set('Cookie', writer)
        .set(idem())
        .send(aPetInput())
        .expect(201)
    ).body;
    await request(t.http)
      .post(`/api/owners/${o.id}/pets/${p.id}/encounters`)
      .set('Cookie', writer)
      .set(idem())
      .send({ date: '2026-10-07', chiefComplaint: 'x' })
      .expect(201);
    for (const table of ['owners', 'pets', 'encounters']) {
      const { rows } = await testDb.sql.query(`select created_by, updated_by, created_at from ${table}`);
      expect([table, rows[0].created_by, rows[0].updated_by]).toEqual([table, 2, 2]);
      expect(rows[0].created_at).toBeInstanceOf(Date);
    }
  });

  it('007/CA-4.2 a autoria é consultável por cadastro e não muda pelos caminhos normais', async () => {
    const o = (await t.api.post('/api/owners').set(idem()).send(anOwnerInput()).expect(201)).body;
    const writer = await loginAs(t.http, 'writer');
    await request(t.http)
      .patch(`/api/owners/${o.id}`)
      .set('Cookie', writer)
      .set(idem())
      .send({ version: 0, city: 'X', createdBy: 3, updatedBy: 3, createdAt: '2000-01-01' })
      .expect(200);
    const a = (await t.api.get(`/api/owners/${o.id}/authorship`).expect(200)).body;
    expect(a.createdBy).toEqual({ id: 1, name: 'Ana Admin' });
    expect(a.updatedBy).toEqual({ id: 2, name: 'Carla Escrita' });
    expect(Object.keys(ROUTE_ROLES).filter((k) => /authorship/.test(k))).toEqual([
      'GET /api/owners/:ownerId/authorship',
    ]);
  });

  it('007/CA-4.3 não há caminho de escrita anônimo', async () => {
    for (const [key] of writes) {
      const [method, path] = key.split(' ') as [string, string];
      const res = await request(t.http)[method.toLowerCase() as 'post'](url(path)).set(idem()).send({});
      expect([key, res.status]).toEqual([key, 401]);
    }
    expect(await testDb.count('owners')).toBe(0);
  });
});
