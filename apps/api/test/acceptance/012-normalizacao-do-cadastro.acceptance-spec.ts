import { AdminSpecialtyOutput, AdminVetOutput, SimilarityDismissalOutput } from '@lubyvet/contracts';
import request from 'supertest';
import { anOwnerInput } from '../builders/owner.builder';
import { ROUTE_ROLES } from '../../src/shared/interface/http/roles';
import { bootApp, idem, loginAs, type TestApp } from '../support/app';
import { CONSISTENCY } from '../support/consistency';
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

  describe('US-3 Histórico da dispensa do aviso de dono parecido (D51)', () => {
    const PHONE = '(11) 98765-4321';
    const asWriter = async () => {
      const cookie = await loginAs(t.http, 'writer');
      return {
        post: (body: object) =>
          request(t.http).post('/api/owners').set('Cookie', cookie).set(idem()).send(body),
        patch: (id: number, body: object) =>
          request(t.http).patch(`/api/owners/${id}`).set('Cookie', cookie).set(idem()).send(body),
      };
    };
    const owner = async (over: object = {}) =>
      (await t.api.post('/api/owners').set(idem()).send(anOwnerInput(over)).expect(201)).body as {
        id: number;
        version: number;
      };
    const dismissals = async (ownerId: number) => {
      const body = (await t.api.get(`/api/owners/${ownerId}/similarity-dismissals`).expect(200))
        .body as unknown[];
      return body.map((d) => SimilarityDismissalOutput.strict().parse(d));
    };
    const dismissedAt = async (ownerId: number) =>
      (
        await testDb.sql.query<{ similarity_dismissed_at: Date | null }>(
          'select similarity_dismissed_at from owners where id = $1',
          [ownerId],
        )
      ).rows[0]?.similarity_dismissed_at ?? null;

    it('012/CA-3.1 cada dispensa grava uma linha por candidato, com o dono gravado, o parecido, quem dispensou e quando', async () => {
      const ana = await owner({ telephone: PHONE, firstName: 'Ana', lastName: 'Souza' });
      const bia = await owner({ telephone: PHONE, firstName: 'Bia', lastName: 'Lima', confirmSimilar: true });
      const writer = await asWriter();
      t.clock.set('2026-10-07T14:00:00-03:00');

      // Sem confirmação nada se grava, nem no histórico.
      await writer.post(anOwnerInput({ telephone: PHONE })).expect(409);
      expect(await testDb.count('owner_similarity_dismissals')).toBe(1);

      const caio = (await writer.post(anOwnerInput({ telephone: PHONE, confirmSimilar: true })).expect(201))
        .body as { id: number };
      expect(await dismissals(caio.id)).toEqual([
        {
          similarOwner: { id: ana.id, firstName: 'Ana', lastName: 'Souza' },
          dismissedBy: { id: 2, name: 'Carla Escrita' },
          dismissedAt: '2026-10-07T17:00:00.000Z',
        },
        {
          similarOwner: { id: bia.id, firstName: 'Bia', lastName: 'Lima' },
          dismissedBy: { id: 2, name: 'Carla Escrita' },
          dismissedAt: '2026-10-07T17:00:00.000Z',
        },
      ]);
      expect((await dismissals(bia.id)).map((d) => [d.similarOwner.id, d.dismissedBy.name])).toEqual([
        [ana.id, 'Ana Admin'],
      ]);

      // Alterar para o celular de outros donos também grava uma linha por candidato.
      const davi = await owner({ firstName: 'Davi' });
      t.clock.set('2026-10-07T15:00:00-03:00');
      await writer.patch(davi.id, { version: davi.version, telephone: PHONE }).expect(409);
      await writer
        .patch(davi.id, { version: davi.version, telephone: PHONE, confirmSimilar: true })
        .expect(200);
      expect((await dismissals(davi.id)).map((d) => d.similarOwner.id)).toEqual([ana.id, bia.id, caio.id]);
      expect(await testDb.count('owner_similarity_dismissals')).toBe(6);
    });

    it('012/CA-3.2 o Administrador lê as dispensas da mais recente para a mais antiga; Leitura e Escrita recebem 403', async () => {
      const ana = await owner({ telephone: PHONE });
      const bia = await owner({ telephone: '(21) 99123-0045' });
      const other = await owner({ telephone: '(21) 99123-0045', confirmSimilar: true });
      t.clock.set('2026-10-08T09:00:00-03:00');
      const changed = (
        await t.api
          .patch(`/api/owners/${bia.id}`)
          .set(idem())
          .send({ version: bia.version, telephone: PHONE, confirmSimilar: true })
          .expect(200)
      ).body as { version: number };
      t.clock.set('2026-10-09T09:00:00-03:00');
      await t.api
        .patch(`/api/owners/${bia.id}`)
        .set(idem())
        .send({ version: changed.version, telephone: '(21) 99123-0045', confirmSimilar: true })
        .expect(200);
      expect((await dismissals(bia.id)).map((d) => [d.dismissedAt, d.similarOwner.id])).toEqual([
        ['2026-10-09T12:00:00.000Z', other.id],
        ['2026-10-08T12:00:00.000Z', ana.id],
      ]);
      expect(await dismissals(ana.id)).toEqual([]);
      expect((await t.api.get('/api/owners/999999/similarity-dismissals')).status).toBe(404);

      expect(ROUTE_ROLES['GET /api/owners/:ownerId/similarity-dismissals']).toEqual(['admin']);
      for (const role of ['writer', 'reader'] as const) {
        const cookie = await loginAs(t.http, role);
        const res = await request(t.http)
          .get(`/api/owners/${bia.id}/similarity-dismissals`)
          .set('Cookie', cookie);
        expect(res.status).toBe(403);
        expect(res.body).toEqual({ error: { code: 'forbidden' } });
      }
    });

    it('012/CA-3.4 a última dispensa no dono é a da linha mais recente do histórico, e a consulta de consistência acusa a divergência', async () => {
      await owner({ telephone: PHONE });
      const bia = await owner({ telephone: PHONE, confirmSimilar: true });
      const caio = await owner({ telephone: '(21) 99123-0045' });
      t.clock.set('2026-10-08T10:30:00-03:00');
      await t.api
        .patch(`/api/owners/${caio.id}`)
        .set(idem())
        .send({ version: caio.version, telephone: PHONE, confirmSimilar: true })
        .expect(200);
      for (const id of [bia.id, caio.id])
        expect((await dismissedAt(id))?.toISOString()).toBe((await dismissals(id))[0]?.dismissedAt);
      expect((await testDb.sql.query(CONSISTENCY)).rows).toEqual([]);

      // Divergência fabricada por fora da aplicação: a consulta acusa o dono.
      await testDb.sql.query(`update owners set similarity_dismissed_at = now() where id = $1`, [bia.id]);
      expect((await testDb.sql.query(CONSISTENCY)).rows).toEqual([
        { entity: 'owner', id: bia.id, problem: 'última dispensa diverge do histórico' },
      ]);

      // A anonimização limpa a coluna e mantém o histórico, que só tem identificadores (P2).
      await t.api.post(`/api/owners/${bia.id}/anonymize`).set(idem()).expect(200);
      expect(await dismissedAt(bia.id)).toBeNull();
      expect(await dismissals(bia.id)).toHaveLength(1);
      expect((await testDb.sql.query(CONSISTENCY)).rows).toEqual([]);
    });
  });
});
