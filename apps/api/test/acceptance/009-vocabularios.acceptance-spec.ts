import { RegisterPetInput } from '@lubyvet/contracts';
import { ROUTE_ROLES } from '../../src/shared/interface/http/roles';
import { bootApp, idem, type TestApp } from '../support/app';
import { aPetInput, anOwner, postPet } from '../support/pets';
import { testDb } from '../support/test-db';

const fieldOf = (body: { error?: { fields?: { path: string; code: string }[] } }) =>
  Object.fromEntries((body.error?.fields ?? []).map((f) => [f.path, f.code]));

describe('009 Vocabulários do domínio: critérios de aceite', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  const species = (name: string) => t.api.post('/api/admin/species').set(idem()).send({ name });
  const vet = (firstName: string, lastName: string, specialtyIds: number[] = []) =>
    t.api.post('/api/admin/vets').set(idem()).send({ firstName, lastName, specialtyIds });
  const catalog = async () =>
    (await t.api.get('/api/vets?pageSize=50').expect(200)).body.items as {
      id: number;
      lastName: string;
      specialties: { name: string }[];
    }[];

  it('009/CA-1.1 a espécie incluída fica disponível na hora para o cadastro de animal', async () => {
    const s = (await species('Furão').expect(201)).body;
    expect((await t.api.get('/api/species')).body).toContainEqual({ id: s.id, name: 'Furão' });
    const o = await anOwner(t);
    await postPet(t, o.id, aPetInput({ speciesId: s.id })).expect(201);
  });

  it('009/CA-1.2 renomear a espécie mantém os animais vinculados', async () => {
    const s = (await species('Furao').expect(201)).body;
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput({ speciesId: s.id }))).body;
    await t.api
      .patch(`/api/admin/species/${s.id}`)
      .set(idem())
      .send({ version: s.version, name: 'Furão' })
      .expect(200);
    expect((await t.api.get(`/api/owners/${o.id}/pets/${p.id}`)).body.species).toEqual({
      id: s.id,
      name: 'Furão',
    });
  });

  it('009/CA-1.3 espécie em uso não se remove: não existe caminho de remoção, só sair de uso (P2)', async () => {
    const s = (await species('Furão').expect(201)).body;
    const o = await anOwner(t);
    await postPet(t, o.id, aPetInput({ speciesId: s.id })).expect(201);
    expect(Object.keys(ROUTE_ROLES).filter((k) => k.startsWith('DELETE') && k.includes('species'))).toEqual(
      [],
    );
    expect((await t.api.delete(`/api/admin/species/${s.id}`).set(idem())).status).toBe(404);
    const off = await t.api
      .patch(`/api/admin/species/${s.id}`)
      .set(idem())
      .send({ version: s.version, status: 'inactive' })
      .expect(200);
    expect(off.body).toMatchObject({ status: 'inactive', petsCount: 1 });
    expect((await t.api.get('/api/species')).body.map((x: { id: number }) => x.id)).not.toContain(s.id);
    const refused = await postPet(t, o.id, aPetInput({ name: 'Novo', speciesId: s.id })).expect(422);
    expect(fieldOf(refused.body).speciesId).toBe('species_inactive');
  });

  it('009/CA-1.4 a espécie é escolhida pelo identificador, não pela grafia digitada (P-10)', () => {
    expect(RegisterPetInput.safeParse({ ...aPetInput(), speciesId: 'cão' }).success).toBe(false);
    expect(RegisterPetInput.safeParse({ ...aPetInput(), speciesId: 2 }).success).toBe(true);
  });

  it('009/CA-2.1 inclui veterinário com nenhuma, uma ou várias especialidades', async () => {
    await vet('A', 'Zero').expect(201);
    await vet('B', 'Uma', [1]).expect(201);
    await vet('C', 'Varias', [1, 2, 3]).expect(201);
    const byName = Object.fromEntries((await catalog()).map((v) => [v.lastName, v.specialties.length]));
    expect(byName).toEqual({ Zero: 0, Uma: 1, Varias: 3 });
  });

  it('009/CA-2.2 altera as especialidades de um veterinário cadastrado', async () => {
    const v = (await vet('Rui', 'Lima', [1]).expect(201)).body;
    await t.api
      .patch(`/api/admin/vets/${v.id}`)
      .set(idem())
      .send({ version: v.version, addSpecialtyId: 2 })
      .expect(200);
    expect((await catalog())[0]?.specialties.map((s) => s.name)).toEqual(['Cirurgia', 'Radiologia']);
  });

  it('009/CA-2.3 o mesmo par veterinário e especialidade não se atribui duas vezes', async () => {
    expect(fieldOf((await vet('Rui', 'Lima', [1, 1]).expect(422)).body).specialtyIds).toBe(
      'specialty_already_linked',
    );
    const v = (await vet('Ana', 'Lima', [1]).expect(201)).body;
    const again = await t.api
      .patch(`/api/admin/vets/${v.id}`)
      .set(idem())
      .send({ version: v.version, addSpecialtyId: 1 });
    expect(again.status).toBe(422);
    expect(fieldOf(again.body).addSpecialtyId ?? fieldOf(again.body).specialtyIds).toBe(
      'specialty_already_linked',
    );
    const { rows } = await testDb.sql.query(
      "select indexname from pg_indexes where tablename = 'vet_specialties' and indexdef ilike '%unique%'",
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it('009/CA-2.4 o desligado sai do catálogo e o histórico que o cita continua', async () => {
    const v = (await vet('Helena', 'Costa').expect(201)).body;
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput())).body;
    await t.api
      .post(`/api/owners/${o.id}/pets/${p.id}/encounters`)
      .set(idem())
      .send({ date: '2026-10-01', chiefComplaint: 'x', vetId: v.id })
      .expect(201);
    await t.api
      .patch(`/api/admin/vets/${v.id}`)
      .set(idem())
      .send({ version: v.version, status: 'dismissed' })
      .expect(200);
    expect(await catalog()).toEqual([]);
    expect((await t.api.get(`/api/owners/${o.id}/pets/${p.id}/visits`)).body.encounters[0].vetId).toBe(v.id);
    expect((await t.api.get(`/api/vets/${v.id}/patients`).expect(200)).body).toHaveLength(1);
  });

  it('009/CA-2.5 a alteração aparece no catálogo na consulta seguinte', async () => {
    const v = (await vet('Rui', 'Lima').expect(201)).body;
    expect((await catalog()).map((x) => x.lastName)).toEqual(['Lima']);
    await t.api
      .patch(`/api/admin/vets/${v.id}`)
      .set(idem())
      .send({ version: v.version, lastName: 'Lemos' })
      .expect(200);
    expect((await catalog()).map((x) => x.lastName)).toEqual(['Lemos']);
  });
});
