export interface CatalogVet {
  id: number;
  firstName: string;
  lastName: string;
  specialties: { id: number; name: string }[];
}
export interface CatalogPage {
  items: CatalogVet[];
  page: number;
  pageSize: number;
  total: number;
}

export interface VetCatalogReader {
  count(): Promise<number>;
  /** Ordem explícita e estável: sobrenome, nome, sem caixa nem acento; desempate por id (P-07). */
  page(offset: number, limit: number): Promise<CatalogVet[]>;
}
export const VET_CATALOG_READER = Symbol('VetCatalogReader');

/** P-08: memória do catálogo, invalidada em toda escrita e com prazo de segurança. */
export interface VetCatalogCache {
  get(page: number, pageSize: number): Promise<CatalogPage | null>;
  set(value: CatalogPage): Promise<void>;
  invalidate(): Promise<void>;
}
export const VET_CATALOG_CACHE = Symbol('VetCatalogCache');

/** 004/CA-4.4: animais atendidos por um veterinário. */
export interface VetPatientsReader {
  /** null quando o veterinário não existe (008/CA-1.1: não encontrado, nunca lista vazia). */
  list(
    vetId: number,
  ): Promise<{ petId: number; petName: string; ownerId: number; encounters: number }[] | null>;
}
export const VET_PATIENTS_READER = Symbol('VetPatientsReader');

/** Regra de nomes do veterinário, exposta aos outros módulos pela porta (005/T002). */
export { checkVetNames } from '../../domain/vet';
