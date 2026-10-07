import request from 'supertest';
import { OWNER_PET_ROUTES } from '../../src/shared/interface/http/route-inventory';
import { anOwnerInput } from '../builders/owner.builder';
import { bootApp, idem, type TestApp } from '../support/app';
import { SPECIES, testDb } from '../support/test-db';

// 003/T013, P1, Pergunta 23: escrito ANTES da resolução do animal pelo dono (T014).
describe('isolamento entre donos (P1)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  const ownerWithPet = async (name: string) => {
    const owner = (await request(t.http).post('/api/owners').set(idem()).send(anOwnerInput()).expect(201))
      .body;
    const pet = (
      await request(t.http)
        .post(`/api/owners/${owner.id}/pets`)
        .set(idem())
        .send({ name, birthDate: '2020-05-01', speciesId: SPECIES.dog })
        .expect(201)
    ).body;
    return { owner, pet };
  };
  const call = (r: (typeof OWNER_PET_ROUTES)[number], ownerId: number, petId: number) =>
    request(t.http)
      [r.method](
        r.path
          .replace(':ownerId', String(ownerId))
          .replace(':petId', String(petId))
          .replace(':appointmentId', '1'),
      )
      .set(idem())
      .send({
        version: 0,
        name: 'Invasor',
        scheduledAt: '2026-12-01T10:00:00-03:00',
        description: 'Retorno',
        date: '2026-10-07',
        chiefComplaint: 'Tosse',
      });

  it.each(OWNER_PET_ROUTES.map((r) => [`${r.method.toUpperCase()} ${r.path}`, r] as const))(
    'UT-017-1/2: %s com o animal de outro dono responde 404 sem expor nenhum campo do animal',
    async (_label, route) => {
      const a = await ownerWithPet('Thor');
      const b = await ownerWithPet('Mel');
      const res = await call(route, b.owner.id, a.pet.id);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: { code: 'pet_not_found' } });
      expect(JSON.stringify(res.body)).not.toContain('Thor');
    },
  );

  it('UT-017-3: o caminho legítimo continua funcionando', async () => {
    const a = await ownerWithPet('Thor');
    const res = await request(t.http).get(`/api/owners/${a.owner.id}/pets/${a.pet.id}`).expect(200);
    expect(res.body.name).toBe('Thor');
  });

  it('UT-017-4: a alteração pelo dono errado não muda nada no banco', async () => {
    const a = await ownerWithPet('Thor');
    const b = await ownerWithPet('Mel');
    await call({ method: 'patch', path: '/api/owners/:ownerId/pets/:petId' }, b.owner.id, a.pet.id);
    const { rows } = await testDb.sql.query<{ name: string }>('select name from pets where id = $1', [
      a.pet.id,
    ]);
    expect(rows[0]?.name).toBe('Thor');
  });

  it('UT-017-5: o inventário cobre toda rota que recebe dono e animal', () => {
    expect(OWNER_PET_ROUTES.length).toBeGreaterThanOrEqual(2);
    for (const r of OWNER_PET_ROUTES) expect(r.path).toMatch(/:ownerId.*:petId/);
  });
});
