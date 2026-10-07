/**
 * Inventário das rotas que recebem identificador na URL (008/T001) e, entre elas, as que recebem
 * dono e animal juntos (003/T013, P1). Rota nova com esses parâmetros entra aqui e nos testes.
 */
export interface InventoryRoute {
  method: 'get' | 'patch' | 'post' | 'put' | 'delete';
  path: string;
}

export const OWNER_PET_ROUTES: readonly InventoryRoute[] = [
  { method: 'get', path: '/api/owners/:ownerId/pets/:petId' },
  { method: 'patch', path: '/api/owners/:ownerId/pets/:petId' },
];
