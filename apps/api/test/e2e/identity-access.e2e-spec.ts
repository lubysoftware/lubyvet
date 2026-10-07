import Redis from 'ioredis';
import request from 'supertest';
import { ROUTE_ROLES } from '../../src/shared/interface/http/roles';
import { PERSONAL_DATA_ROUTES } from '../../src/shared/interface/http/route-inventory';
import { bootApp, idem, loginAs, type TestApp } from '../support/app';
import { testDb } from '../support/test-db';

const url = (path: string) => path.replace(/:\w+/g, '1');

// 007: T007 (acesso anônimo pela lista), T014 (papel por caminho de escrita), T015 (identificação e autenticação).
describe('identificação e autorização', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  it.each(PERSONAL_DATA_ROUTES.map((r) => [`${r.method.toUpperCase()} ${r.path}`, r] as const))(
    'T007: %s sem sessão é recusado com 401 antes de ler qualquer dado',
    async (_l, r) => {
      const res = await request(t.http)[r.method](url(r.path)).set(idem()).send({});
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: { code: 'unauthenticated' } });
    },
  );

  const writes = Object.entries(ROUTE_ROLES).filter(
    ([k, v]) => v !== 'public' && !k.startsWith('GET') && !k.includes('/session'),
  );
  it.each(writes)('T014: %s recusa o papel Leitura com 403', async (key) => {
    const [method, path] = key.split(' ') as [string, string];
    const cookie = await loginAs(t.http, 'reader');
    const res = await request(t.http)
      [method.toLowerCase() as 'post'](url(path))
      .set('Cookie', cookie)
      .set(idem())
      .send({});
    expect(res.status).toBe(403);
  });

  it('T014: Escrita grava dono mas não acessa a administração; Administrador acessa', async () => {
    const writer = await loginAs(t.http, 'writer');
    await request(t.http).get('/api/owners').set('Cookie', writer).expect(200);
    await request(t.http).get('/api/admin/species').set('Cookie', writer).expect(403);
    await t.api.get('/api/admin/species').expect(200);
  });

  it('T015: a recusa de login é genérica, e a sessão aberta se identifica e se encerra', async () => {
    const wrong = await request(t.http)
      .post('/api/session')
      .send({ login: 'admin@lubyvet.test', password: 'errada' })
      .expect(401);
    const unknown = await request(t.http)
      .post('/api/session')
      .send({ login: 'ninguem@lubyvet.test', password: 'x' })
      .expect(401);
    expect(wrong.body).toEqual(unknown.body);
    const cookie = await loginAs(t.http, 'writer');
    expect((await request(t.http).get('/api/session').set('Cookie', cookie).expect(200)).body).toEqual({
      userId: 2,
      name: 'Carla Escrita',
      role: 'writer',
    });
    await request(t.http).delete('/api/session').set('Cookie', cookie).expect(204);
    await request(t.http).get('/api/session').set('Cookie', cookie).expect(401);
  });

  it('T015: cinco senhas erradas bloqueiam o login, mesmo com a senha certa depois (P-15)', async () => {
    for (let i = 0; i < 5; i++)
      await request(t.http)
        .post('/api/session')
        .send({ login: 'reader@lubyvet.test', password: 'errada' })
        .expect(401);
    await request(t.http)
      .post('/api/session')
      .send({ login: 'reader@lubyvet.test', password: 'senha-de-teste-123' })
      .expect(401);
  });

  it('T008: a sessão nasce com prazo de 8 horas de inatividade no Redis (D19)', async () => {
    const cookie = await loginAs(t.http, 'writer');
    const r = new Redis(process.env.REDIS_URL ?? '');
    const ttl = await r.ttl(`lubyvet:session:${cookie.split('=')[1]}`);
    r.disconnect();
    expect(ttl).toBeGreaterThan(8 * 3600 - 10);
  });
});
