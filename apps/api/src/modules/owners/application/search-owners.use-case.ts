import type { OwnerSearchPort, OwnerSummaryRow } from './ports/owner-search.port';

export interface SearchOwnersResult {
  items: OwnerSummaryRow[];
  page: number;
  pageSize: number;
  total: number;
  lastName: string;
}

/** T002: o termo é aparado e tem espaços internos colapsados, e é o mesmo devolvido aos links. */
export function normalizeTerm(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * 002: busca de donos pelo começo do sobrenome, sem diferenciar maiúsculas, paginada no banco.
 * T005: página fora da faixa vira a última página válida, com piso explícito de uma página.
 */
export class SearchOwners {
  constructor(private readonly search: OwnerSearchPort) {}

  async execute(query: { lastName: string; page: number; pageSize: number }): Promise<SearchOwnersResult> {
    const lastName = normalizeTerm(query.lastName);
    const total = await this.search.count(lastName);
    const lastPage = Math.max(1, Math.ceil(total / query.pageSize));
    const page = Math.min(Math.max(1, query.page), lastPage);
    const items =
      total === 0 ? [] : await this.search.page(lastName, (page - 1) * query.pageSize, query.pageSize);
    return { items, page, pageSize: query.pageSize, total, lastName };
  }
}
