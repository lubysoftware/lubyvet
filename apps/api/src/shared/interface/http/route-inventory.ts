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
  { method: 'get', path: '/api/owners/:ownerId/pets/:petId/visits' },
  { method: 'post', path: '/api/owners/:ownerId/pets/:petId/appointments' },
  { method: 'patch', path: '/api/owners/:ownerId/pets/:petId/appointments/:appointmentId' },
  { method: 'post', path: '/api/owners/:ownerId/pets/:petId/appointments/:appointmentId/cancel' },
  { method: 'post', path: '/api/owners/:ownerId/pets/:petId/appointments/:appointmentId/no-show' },
  { method: 'post', path: '/api/owners/:ownerId/pets/:petId/encounters' },
];

/**
 * 007/T001: caminhos que leem ou escrevem dado pessoal (dono, animal, visita, sessão). Todos exigem
 * identificação, sem exceção (D04); os testes de acesso anônimo percorrem esta lista.
 */
export const PERSONAL_DATA_ROUTES: readonly InventoryRoute[] = [
  { method: 'get', path: '/api/owners' },
  { method: 'post', path: '/api/owners' },
  { method: 'get', path: '/api/owners/:ownerId' },
  { method: 'patch', path: '/api/owners/:ownerId' },
  { method: 'get', path: '/api/owners/:ownerId/record' },
  { method: 'post', path: '/api/owners/:ownerId/pets' },
  ...OWNER_PET_ROUTES,
  { method: 'get', path: '/api/vets/:vetId/patients' },
];
