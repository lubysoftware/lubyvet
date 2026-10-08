import type { Role } from '@lubyvet/contracts';

/**
 * 007/T004, D18: a matriz de ações por papel, num único arquivo. A chave é "MÉTODO caminho" com
 * o padrão da rota. Rota fora desta matriz é recusada por padrão (T005). "public" dispensa sessão.
 */
const ALL: readonly Role[] = ['reader', 'writer', 'admin'];
const WRITE: readonly Role[] = ['writer', 'admin'];
const ADMIN: readonly Role[] = ['admin'];

export const ROUTE_ROLES: Readonly<Record<string, readonly Role[] | 'public'>> = {
  'POST /api/session': 'public',
  'GET /api/session': ALL,
  'DELETE /api/session': ALL,
  'GET /api/health/live': 'public',
  'GET /api/health/ready': 'public',
  'GET /api/owners': ALL,
  'POST /api/owners': WRITE,
  'GET /api/owners/:ownerId': ALL,
  'PATCH /api/owners/:ownerId': WRITE,
  'GET /api/owners/:ownerId/record': ALL,
  'GET /api/owners/:ownerId/authorship': ALL,
  'POST /api/owners/:ownerId/anonymize': ADMIN,
  'GET /api/owners/:ownerId/free-text': ADMIN,
  'POST /api/owners/:ownerId/free-text/redact': ADMIN,
  'GET /api/species': ALL,
  'POST /api/owners/:ownerId/pets': WRITE,
  'GET /api/owners/:ownerId/pets/:petId': ALL,
  'PATCH /api/owners/:ownerId/pets/:petId': WRITE,
  'GET /api/owners/:ownerId/pets/:petId/visits': ALL,
  'POST /api/owners/:ownerId/pets/:petId/appointments': WRITE,
  'PATCH /api/owners/:ownerId/pets/:petId/appointments/:appointmentId': WRITE,
  'POST /api/owners/:ownerId/pets/:petId/appointments/:appointmentId/cancel': WRITE,
  'POST /api/owners/:ownerId/pets/:petId/appointments/:appointmentId/no-show': WRITE,
  'POST /api/owners/:ownerId/pets/:petId/encounters': WRITE,
  'GET /api/vets': ALL,
  'GET /api/vets/:vetId/patients': ALL,
  'GET /api/admin/species': ADMIN,
  'POST /api/admin/species': ADMIN,
  'PATCH /api/admin/species/:speciesId': ADMIN,
  'GET /api/admin/specialties': ADMIN,
  'POST /api/admin/specialties': ADMIN,
  'PATCH /api/admin/specialties/:specialtyId': ADMIN,
  'GET /api/admin/vets': ADMIN,
  'POST /api/admin/vets': ADMIN,
  'PATCH /api/admin/vets/:vetId': ADMIN,
  'GET /api/admin/metrics': ADMIN,
  'GET /api/admin/info': ADMIN,
};

export interface Actor {
  userId: number;
  role: Role;
}
