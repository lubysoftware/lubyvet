export interface OwnerSummaryRow {
  id: number;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  telephone: string;
  petNames: string[];
}

/** Leitura de listagem: recorta no banco (002/T010), nunca lê tudo para cortar depois. */
export interface OwnerSearchPort {
  count(lastNamePrefix: string): Promise<number>;
  page(lastNamePrefix: string, offset: number, limit: number): Promise<OwnerSummaryRow[]>;
}
export const OWNER_SEARCH = Symbol('OwnerSearch');
