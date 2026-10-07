import type { CatalogPage, VetCatalogCache, VetCatalogReader } from './ports/vet-catalog.port';

/** 005/T005, T006, T009: catálogo de tela, paginado; página fora da faixa leva à primeira (CA-2.3). */
export class GetVetCatalog {
  constructor(
    private readonly reader: VetCatalogReader,
    private readonly cache: VetCatalogCache,
  ) {}

  async execute(page: number, pageSize: number): Promise<CatalogPage> {
    const cached = await this.cache.get(page, pageSize);
    if (cached) return cached;
    const total = await this.reader.count();
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    const effective = page >= 1 && page <= lastPage ? page : 1;
    const value = {
      items: total === 0 ? [] : await this.reader.page((effective - 1) * pageSize, pageSize),
      page: effective,
      pageSize,
      total,
    };
    if (effective === page) await this.cache.set(value);
    return value;
  }
}
