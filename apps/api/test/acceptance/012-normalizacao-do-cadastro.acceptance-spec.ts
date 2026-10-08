import { AdminSpecialtyOutput, AdminVetOutput } from '@lubyvet/contracts';
import request from 'supertest';
import { ROUTE_ROLES } from '../../src/shared/interface/http/roles';
import { bootApp, idem, loginAs, type TestApp } from '../support/app';
import { testDb } from '../support/test-db';

const fieldOf = (body: { error?: { fields?: { path: string; code: string }[] } }) =>
  Object.fromEntries((body.error?.fields ?? []).map((f) => [f.path, f.code]));

/** Especialidades da carga do teste: 1 Radiologia, 2 Cirurgia, 3 Odontologia. */
const RADIOLOGY = 1;
const SURGERY = 2;
const DENTISTRY = 3;

describe('012 Normalização do cadastro: critérios de aceite', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp('2026-10-07T12:00:00-03:00');
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  const specialty = (name: string) => t.api.post('/api/admin/specialties').set(idem()).send({ name });
  const changeSpecialty = (id: number, body: object) =>
    t.api.patch(`/api/admin/specialties/${id}`).set(idem()).send(body);
  const specialties = async () =>
    (await t.api.get('/api/admin/specialties').expect(200)).body as AdminSpecialtyOutput[];
  const vet = (lastName: string, specialtyIds: number[] = []) =>
    t.api.post('/api/admin/vets').set(idem()).send({ firstName: 'Rui', lastName, specialtyIds });
  const changeVet = (id: number, body: object) => t.api.patch(`/api/admin/vets/${id}`).set(idem()).send(body);
  const catalog = async () =>
    Object.fromEntries(
      (
        (await t.api.get('/api/vets?pageSize=50').expect(200)).body.items as {
          lastName: string;
          specialties: { name: string }[];
        }[]
      ).map((v) => [v.lastName, v.specialties.map((s) => s.name)]),
    );

  describe('US-4 Manter as especialidades (D52)', () => {
    it('012/CA-4.1 a especialidade incluída fica disponível para atribuir na consulta seguinte', async () => {
      const created = await specialty(' Dermatologia ').expect(201);
      const s = AdminSpecialtyOutput.strict().parse(created.body);
      expect(s).toMatchObject({ name: 'Dermatologia', status: 'active', version: 0, vetsCount: 0 });
      const listed = await specialties();
      for (const row of listed) AdminSpecialtyOutput.strict().parse(row);
      expect(listed.map((x) => x.name)).toEqual(['Cirurgia', 'Dermatologia', 'Odontologia', 'Radiologia']);
      await vet('Lima', [s.id]).expect(201);
      expect(await catalog()).toEqual({ Lima: ['Dermatologia'] });
      expect((await specialties()).find((x) => x.id === s.id)?.vetsCount).toBe(1);
    });

    it('012/CA-4.2 renomear a especialidade muda o nome nos veterinários que a têm, no catálogo', async () => {
      await vet('Lima', [SURGERY]).expect(201);
      expect(await catalog()).toEqual({ Lima: ['Cirurgia'] });
      const renamed = await changeSpecialty(SURGERY, { version: 0, name: 'Cirurgia geral' }).expect(200);
      expect(AdminSpecialtyOutput.strict().parse(renamed.body)).toMatchObject({
        id: SURGERY,
        name: 'Cirurgia geral',
        version: 1,
        vetsCount: 1,
      });
      expect(await catalog()).toEqual({ Lima: ['Cirurgia geral'] });
    });

    it('012/CA-4.3 nome repetido, sem diferenciar maiúsculas, é recusado no próprio campo', async () => {
      expect(fieldOf((await specialty('cirurgia').expect(422)).body)).toEqual({
        name: 'specialty_name_taken',
      });
      expect(
        fieldOf((await changeSpecialty(RADIOLOGY, { version: 0, name: 'ODONTOLOGIA' }).expect(422)).body),
      ).toEqual({ name: 'specialty_name_taken' });
      expect(await testDb.count('specialties')).toBe(3);
    });

    it('012/CA-4.4 especialidade inativa não se atribui mais e continua nos veterinários que já a têm', async () => {
      const lima = (await vet('Lima', [DENTISTRY]).expect(201)).body;
      const off = (await changeSpecialty(DENTISTRY, { version: 0, status: 'inactive' }).expect(200)).body;
      expect(off).toMatchObject({ status: 'inactive', vetsCount: 1 });

      expect(fieldOf((await vet('Costa', [RADIOLOGY, DENTISTRY]).expect(422)).body)).toEqual({
        specialtyIds: 'specialty_inactive',
      });
      expect(
        fieldOf(
          (await changeVet(lima.id, { version: lima.version, addSpecialtyId: DENTISTRY }).expect(422)).body,
        ),
      ).toEqual({ addSpecialtyId: 'specialty_inactive' });
      const costa = (await vet('Costa').expect(201)).body;
      expect(
        fieldOf(
          (await changeVet(costa.id, { version: costa.version, addSpecialtyId: DENTISTRY }).expect(422)).body,
        ),
      ).toEqual({ addSpecialtyId: 'specialty_inactive' });

      expect(await catalog()).toEqual({ Costa: [], Lima: ['Odontologia'] });
      expect((await t.api.get('/api/admin/vets').expect(200)).body).toContainEqual(
        expect.objectContaining({ id: lima.id, specialtyIds: [DENTISTRY] }),
      );

      await changeSpecialty(DENTISTRY, { version: off.version, status: 'active' }).expect(200);
      await changeVet(costa.id, { version: costa.version, addSpecialtyId: DENTISTRY }).expect(200);
    });

    it('012/CA-4.5 retirar a especialidade do veterinário aparece no catálogo na consulta seguinte', async () => {
      const lima = (await vet('Lima', [RADIOLOGY, SURGERY]).expect(201)).body;
      expect(await catalog()).toEqual({ Lima: ['Cirurgia', 'Radiologia'] });
      const changed = await changeVet(lima.id, {
        version: lima.version,
        removeSpecialtyId: RADIOLOGY,
      }).expect(200);
      expect(AdminVetOutput.strict().parse(changed.body).specialtyIds).toEqual([SURGERY]);
      expect(await catalog()).toEqual({ Lima: ['Cirurgia'] });
      // O vínculo sai; a especialidade continua cadastrada (P2).
      expect(await testDb.count('specialties')).toBe(3);
      expect((await specialties()).find((s) => s.id === RADIOLOGY)?.vetsCount).toBe(0);
    });

    it('012/CA-4.6 versão vencida é recusada com 409, e só o Administrador mantém especialidade', async () => {
      await changeSpecialty(SURGERY, { version: 0, name: 'Cirurgia geral' }).expect(200);
      const stale = await changeSpecialty(SURGERY, { version: 0, status: 'inactive' }).expect(409);
      expect(stale.body.error).toMatchObject({
        code: 'stale_version',
        current: { id: SURGERY, name: 'Cirurgia geral', status: 'active', version: 1 },
      });
      expect((await changeSpecialty(999999, { version: 0, name: 'X' })).status).toBe(404);

      expect(
        Object.entries(ROUTE_ROLES)
          .filter(([k]) => k.includes('/api/admin/specialties'))
          .map(([k, roles]) => [k, roles]),
      ).toEqual([
        ['GET /api/admin/specialties', ['admin']],
        ['POST /api/admin/specialties', ['admin']],
        ['PATCH /api/admin/specialties/:specialtyId', ['admin']],
      ]);
      for (const role of ['writer', 'reader'] as const) {
        const cookie = await loginAs(t.http, role);
        const as = (r: request.Test) => r.set('Cookie', cookie).set(idem());
        expect((await as(request(t.http).get('/api/admin/specialties'))).status).toBe(403);
        expect((await as(request(t.http).post('/api/admin/specialties')).send({ name: 'Y' })).status).toBe(
          403,
        );
        expect(
          (
            await as(request(t.http).patch(`/api/admin/specialties/${SURGERY}`)).send({
              version: 1,
              name: 'Z',
            })
          ).status,
        ).toBe(403);
      }
      expect(await testDb.count('specialties', { name: 'Cirurgia geral' })).toBe(1);
    });
  });
});
