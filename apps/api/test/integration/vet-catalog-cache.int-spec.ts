import Redis from 'ioredis';
import { RedisVetCatalogCache } from '../../src/modules/vets/infra/redis-vet-catalog.cache';

// 005: T010 (atualidade) e T014 (prazo de segurança de 10 minutos), contra o Redis real.
describe('memória do catálogo no Redis', () => {
  const cache = new RedisVetCatalogCache();
  afterAll(() => cache.onModuleDestroy());
  const page = { items: [], page: 1, pageSize: 10, total: 0 };

  it('T010: depois da invalidação, a próxima leitura não encontra a memória antiga', async () => {
    await cache.set(page);
    expect(await cache.get(1, 10)).toEqual(page);
    await cache.invalidate();
    expect(await cache.get(1, 10)).toBeNull();
  });

  it('T014: a entrada nasce com prazo de 600 segundos', async () => {
    await cache.set(page);
    const r = new Redis(process.env.REDIS_URL ?? '');
    const keys = await r.keys('lubyvet:vets:catalog:*:1:10');
    const ttls = await Promise.all(keys.map((k) => r.ttl(k)));
    r.disconnect();
    expect(Math.max(...ttls)).toBeGreaterThan(590);
    expect(Math.max(...ttls)).toBeLessThanOrEqual(600);
  });
});
