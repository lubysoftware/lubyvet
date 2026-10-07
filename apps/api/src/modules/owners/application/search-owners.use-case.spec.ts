import type { OwnerSearchPort } from './ports/owner-search.port';
import { normalizeTerm, SearchOwners } from './search-owners.use-case';

const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    firstName: 'A',
    lastName: 'B',
    address: 'C',
    city: 'D',
    telephone: 'E',
    petNames: [],
  }));
const port = (total: number): OwnerSearchPort & { calls: [string, number, number][] } => {
  const calls: [string, number, number][] = [];
  return {
    calls,
    count: async () => total,
    page: async (t, o, l) => (calls.push([t, o, l]), rows(Math.min(l, total - o))),
  };
};

describe('SearchOwners', () => {
  it('T002: normaliza o termo e o devolve para os links', async () => {
    expect(normalizeTerm('  da   Silva ')).toBe('da Silva');
    const p = port(3);
    const r = await new SearchOwners(p).execute({ lastName: '  da   Silva ', page: 1, pageSize: 10 });
    expect(r.lastName).toBe('da Silva');
    expect(p.calls).toEqual([['da Silva', 0, 10]]);
  });

  it('T010: recorta no banco pelo deslocamento e limite da página', async () => {
    const p = port(25);
    await new SearchOwners(p).execute({ lastName: '', page: 3, pageSize: 10 });
    expect(p.calls).toEqual([['', 20, 10]]);
  });

  it('T005: página além da última ou abaixo de 1 leva à primeira (CA-2.2)', async () => {
    expect((await new SearchOwners(port(25)).execute({ lastName: '', page: 9, pageSize: 10 })).page).toBe(1);
    expect((await new SearchOwners(port(25)).execute({ lastName: '', page: 3, pageSize: 10 })).page).toBe(3);
    expect((await new SearchOwners(port(25)).execute({ lastName: '', page: 0, pageSize: 10 })).page).toBe(1);
  });

  it('T005: base vazia tem piso explícito de uma página e não consulta itens', async () => {
    const p = port(0);
    const r = await new SearchOwners(p).execute({ lastName: 'x', page: 5, pageSize: 10 });
    expect(r).toMatchObject({ page: 1, total: 0, items: [] });
    expect(p.calls).toEqual([]);
  });
});
