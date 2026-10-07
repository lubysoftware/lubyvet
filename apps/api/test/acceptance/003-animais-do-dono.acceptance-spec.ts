import { PetOutput, RegisterPetInput, ChangePetInput } from '@lubyvet/contracts';
import request from 'supertest';
import { OWNER_PET_ROUTES } from '../../src/shared/interface/http/route-inventory';
import { bootApp, idem, loginAs, type TestApp } from '../support/app';
import { aPetInput, anOwner, patchPet, postPet } from '../support/pets';
import { SPECIES, testDb } from '../support/test-db';

const fieldOf = (body: { error?: { fields?: { path: string; code: string }[] } }) =>
  Object.fromEntries((body.error?.fields ?? []).map((f) => [f.path, f.code]));

describe('003 Animais do dono: critérios de aceite', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  const schedule = (ownerId: number, petId: number, scheduledAt = '2026-11-01T10:00:00-03:00') =>
    t.api
      .post(`/api/owners/${ownerId}/pets/${petId}/appointments`)
      .set(idem())
      .send({ scheduledAt, description: 'Consulta' });

  it('003/CA-1.1 com nome, nascimento e espécie o animal é gravado vinculado ao dono', async () => {
    const o = await anOwner(t);
    const res = await postPet(t, o.id, aPetInput()).expect(201);
    expect(PetOutput.parse(res.body)).toMatchObject({ ownerId: o.id, name: 'Thor', status: 'active' });
    expect((await t.api.get(`/api/owners/${o.id}/record`)).body.pets).toHaveLength(1);
  });

  it('003/CA-1.2 nome vazio ou longo, nascimento vazio ou espécie ausente marcam o campo e nada é gravado', async () => {
    const o = await anOwner(t);
    const res = await postPet(t, o.id, { name: '', birthDate: '' }).expect(422);
    expect(fieldOf(res.body)).toMatchObject({
      name: 'required',
      birthDate: 'invalid_format',
      speciesId: 'species_required',
    });
    expect(fieldOf((await postPet(t, o.id, aPetInput({ name: 'x'.repeat(31) })).expect(422)).body).name).toBe(
      'too_long',
    );
    expect(await testDb.count('pets')).toBe(0);
  });

  it('003/CA-1.3 nascimento no futuro é recusado no campo de data', async () => {
    const o = await anOwner(t);
    const res = await postPet(t, o.id, aPetInput({ birthDate: '2027-01-01' })).expect(422);
    expect(fieldOf(res.body).birthDate).toBe('date_in_future');
  });

  it('003/CA-1.4 a espécie vem de vocabulário fechado; valor fora dele é recusado', async () => {
    const o = await anOwner(t);
    const species = (await t.api.get('/api/species').expect(200)).body as { id: number }[];
    expect(species.length).toBeGreaterThan(0);
    const res = await postPet(t, o.id, aPetInput({ speciesId: 9999 })).expect(422);
    expect(Object.keys(fieldOf(res.body))).toEqual(['speciesId']);
  });

  it('003/CA-1.5 o animal tem exatamente um dono e uma espécie (restrições do banco)', async () => {
    const { rows } = await testDb.sql.query<{ column_name: string; is_nullable: string }>(
      "select column_name, is_nullable from information_schema.columns where table_name = 'pets' and column_name in ('owner_id','species_id')",
    );
    expect(rows.every((r) => r.is_nullable === 'NO')).toBe(true);
    expect(rows).toHaveLength(2);
  });

  it('003/CA-2.1 segundo animal com o mesmo nome, ignorando caixa, é recusado no campo nome', async () => {
    const o = await anOwner(t);
    await postPet(t, o.id, aPetInput({ name: 'Thor' })).expect(201);
    expect(fieldOf((await postPet(t, o.id, aPetInput({ name: 'THOR' })).expect(422)).body).name).toBe(
      'pet_name_taken',
    );
  });

  it('003/CA-2.2 donos diferentes podem ter animais de mesmo nome', async () => {
    const a = await anOwner(t);
    const b = await anOwner(t);
    await postPet(t, a.id, aPetInput({ name: 'Thor' })).expect(201);
    await postPet(t, b.id, aPetInput({ name: 'Thor' })).expect(201);
  });

  it('003/CA-2.3 dois cadastros simultâneos do mesmo nome: um sobrevive, o outro recebe nome em uso', async () => {
    const o = await anOwner(t);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => postPet(t, o.id, aPetInput({ name: 'Rex' }))),
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 422, 422, 422, 422]);
    for (const r of results.filter((x) => x.status === 422))
      expect(fieldOf(r.body).name).toBe('pet_name_taken');
  });

  it('003/CA-2.4 a recusa concorrente vem de restrição do banco homologado, coberta por teste de concorrência', async () => {
    const { rows } = await testDb.sql.query<{ indexname: string }>(
      "select indexname from pg_indexes where tablename = 'pets' and indexname = 'pets_owner_id_lower_name_key'",
    );
    expect(rows).toHaveLength(1);
    // A corrida se repete com caixas diferentes: a restrição do banco decide, sempre do mesmo jeito.
    const o = await anOwner(t);
    for (const name of ['Mel', 'Lua']) {
      const tries = await Promise.all(
        [name, name.toUpperCase(), name.toLowerCase()].map((n) => postPet(t, o.id, aPetInput({ name: n }))),
      );
      expect(tries.map((r) => r.status).sort()).toEqual([201, 422, 422]);
    }
  });

  it('003/CA-2.5 editar mantendo o próprio nome é aceito', async () => {
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput({ name: 'Thor' }))).body;
    await patchPet(t, o.id, p.id, { version: 0, name: 'thor' }).expect(200);
  });

  it('003/CA-3.1 a edição lê os dados atuais do animal', async () => {
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput())).body;
    expect((await t.api.get(`/api/owners/${o.id}/pets/${p.id}`).expect(200)).body).toEqual(p);
  });

  it('003/CA-3.2 a alteração mantém o identificador', async () => {
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput())).body;
    const res = await patchPet(t, o.id, p.id, { version: 0, name: 'Bidu', speciesId: SPECIES.cat }).expect(
      200,
    );
    expect(res.body).toMatchObject({ id: p.id, name: 'Bidu', species: { id: SPECIES.cat }, version: 1 });
  });

  it('003/CA-3.3 as visitas do animal ficam iguais antes e depois da edição', async () => {
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput())).body;
    await schedule(o.id, p.id).expect(201);
    const before = (await t.api.get(`/api/owners/${o.id}/pets/${p.id}/visits`)).body;
    await patchPet(t, o.id, p.id, { version: 0, name: 'Novo' }).expect(200);
    expect((await t.api.get(`/api/owners/${o.id}/pets/${p.id}/visits`)).body).toEqual(before);
  });

  it('003/CA-3.4 a edição valida nome, tamanho e nascimento como o cadastro', async () => {
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput())).body;
    const res = await patchPet(t, o.id, p.id, { version: 0, name: 'x'.repeat(31), birthDate: '2027-01-01' });
    expect(res.status).toBe(422);
    expect(fieldOf(res.body).name).toBe('too_long');
    const future = await patchPet(t, o.id, p.id, { version: 0, birthDate: '2027-01-01' }).expect(422);
    expect(fieldOf(future.body).birthDate).toBe('date_in_future');
  });

  it('003/CA-3.5 Ativo vai a Falecido ou Transferido; só o Administrador volta a Ativo; o nome continua ocupado (D09)', async () => {
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput({ name: 'Thor' }))).body;
    const writer = await loginAs(t.http, 'writer');
    await request(t.http)
      .patch(`/api/owners/${o.id}/pets/${p.id}`)
      .set('Cookie', writer)
      .set(idem())
      .send({ version: 0, status: 'deceased' })
      .expect(200);
    const back = await request(t.http)
      .patch(`/api/owners/${o.id}/pets/${p.id}`)
      .set('Cookie', writer)
      .set(idem())
      .send({ version: 1, status: 'active' });
    expect(back.status).not.toBe(200);
    await patchPet(t, o.id, p.id, { version: 1, status: 'active' }).expect(200);
    await patchPet(t, o.id, p.id, { version: 2, status: 'transferred' }).expect(200);
    expect((await t.api.get(`/api/owners/${o.id}/record`)).body.pets[0].status).toBe('transferred');
    expect(fieldOf((await postPet(t, o.id, aPetInput({ name: 'Thor' })).expect(422)).body).name).toBe(
      'pet_name_taken',
    );
  });

  it('003/CA-4.1 apagar a espécie na edição é recusado no campo e nada muda', async () => {
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput())).body;
    const res = await patchPet(t, o.id, p.id, { version: 0, speciesId: null }).expect(422);
    expect(fieldOf(res.body).speciesId).toBe('species_required');
    expect((await t.api.get(`/api/owners/${o.id}/pets/${p.id}`)).body.version).toBe(0);
  });

  it('003/CA-4.2 a tentativa não produz erro genérico', async () => {
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput())).body;
    for (const speciesId of [null, '', 0, 'gato']) {
      const res = await patchPet(t, o.id, p.id, { version: 0, speciesId });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('validation_failed');
    }
  });

  it('003/CA-4.3 a regra da espécie é a mesma na criação e na edição, num lugar só', () => {
    const missing = { name: 'x', birthDate: '2020-01-01' };
    const a = RegisterPetInput.safeParse(missing);
    const b = ChangePetInput.safeParse({ version: 0, speciesId: null });
    expect(a.success || b.success).toBe(false);
    expect(a.error?.issues[0]?.message).toBe('species_required');
    expect(b.error?.issues[0]?.message).toBe('species_required');
  });

  it('003/CA-5.1 editar o animal por outro dono responde não encontrado sem expor dado', async () => {
    const a = await anOwner(t);
    const b = await anOwner(t);
    const p = (await postPet(t, a.id, aPetInput({ name: 'Segredo' }))).body;
    const read = await t.api.get(`/api/owners/${b.id}/pets/${p.id}`);
    expect(read.status).toBe(404);
    expect(JSON.stringify(read.body)).not.toContain('Segredo');
    expect((await patchPet(t, b.id, p.id, { version: 0, name: 'X' })).status).toBe(404);
  });

  it('003/CA-5.2 o agendamento e todo caminho com dono e animal recusam a combinação errada', async () => {
    const a = await anOwner(t);
    const b = await anOwner(t);
    const p = (await postPet(t, a.id, aPetInput())).body;
    expect((await schedule(b.id, p.id)).status).toBe(404);
    expect((await t.api.get(`/api/owners/${b.id}/pets/${p.id}/visits`)).status).toBe(404);
  });

  it('003/CA-5.3 cada caminho que recebe dono e animal é testado com a combinação errada', async () => {
    const a = await anOwner(t);
    const b = await anOwner(t);
    const p = (await postPet(t, a.id, aPetInput())).body;
    const appt = (await schedule(a.id, p.id).expect(201)).body;
    const routes = OWNER_PET_ROUTES.filter((r) => r.path.includes(':petId'));
    expect(routes.length).toBeGreaterThanOrEqual(7);
    for (const r of routes) {
      const path = r.path
        .replace(':ownerId', String(b.id))
        .replace(':petId', String(p.id))
        .replace(':appointmentId', String(appt.id));
      const res = await t.api[r.method](path).set(idem()).send({
        version: 0,
        name: 'X',
        scheduledAt: '2026-12-01T10:00:00-03:00',
        description: 'x',
        date: '2026-10-07',
        chiefComplaint: 'x',
      });
      expect([r.path, res.status]).toEqual([r.path, 404]);
    }
  });

  it('003/CA-5.4 o caminho legítimo continua funcionando', async () => {
    const a = await anOwner(t);
    const p = (await postPet(t, a.id, aPetInput())).body;
    await t.api.get(`/api/owners/${a.id}/pets/${p.id}`).expect(200);
    await schedule(a.id, p.id).expect(201);
  });
});
