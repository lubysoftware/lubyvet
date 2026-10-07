import { FieldRuleViolation } from '../../../shared/domain/errors';
import { checkVetNames } from '../domain/vet';
import type { CatalogPage, VetCatalogCache, VetCatalogReader } from './ports/vet-catalog.port';
import { GetVetCatalog } from './vet-catalog.use-case';

const reader = (total: number, calls: number[][] = []): VetCatalogReader => ({
  count: async () => total,
  page: async (o, l) => (calls.push([o, l]), [{ id: 1, firstName: 'A', lastName: 'B', specialties: [] }]),
});
const memory = (): VetCatalogCache & { store: Map<string, CatalogPage> } => {
  const store = new Map<string, CatalogPage>();
  return {
    store,
    get: async (p, s) => store.get(`${p}:${s}`) ?? null,
    set: async (v) => void store.set(`${v.page}:${v.pageSize}`, v),
    invalidate: async () => store.clear(),
  };
};

describe('GetVetCatalog', () => {
  it('lê a página do banco, guarda na memória e serve a próxima leitura da memória', async () => {
    const calls: number[][] = [];
    const cache = memory();
    const uc = new GetVetCatalog(reader(12, calls), cache);
    await uc.execute(2, 5);
    await uc.execute(2, 5);
    expect(calls).toEqual([[5, 5]]);
    await cache.invalidate();
    await uc.execute(2, 5);
    expect(calls).toHaveLength(2);
  });

  it('CA-2.3: página fora da faixa leva à primeira e não é guardada como a pedida', async () => {
    const cache = memory();
    const r = await new GetVetCatalog(reader(12), cache).execute(9, 5);
    expect(r.page).toBe(1);
    expect(cache.store.has('9:5')).toBe(false);
    expect((await new GetVetCatalog(reader(0), memory()).execute(1, 5)).items).toEqual([]);
  });

  it('T002: nome e sobrenome obrigatórios, até 30', () => {
    expect(checkVetNames(' Paula ', 'Rezende')).toEqual({ firstName: 'Paula', lastName: 'Rezende' });
    expect(() => checkVetNames('', 'a'.repeat(31))).toThrow(FieldRuleViolation);
  });
});
