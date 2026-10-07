import { AppointmentOutput, OwnerOutput, PetOutput, VetCatalogOutput } from '@lubyvet/contracts';
import { bootApp, idem, type TestApp } from '../support/app';
import { aPetInput, anOwner, postPet } from '../support/pets';
import { readRepo } from '../support/structural';
import { testDb } from '../support/test-db';

/** Campos que descrevem estado de persistência e não podem sair em resposta nenhuma (005/US-5). */
const PERSISTENCE = /"(isNew|new|persisted|dirty|_?version_?state|entityState)"/;
type Vet = { id: number; firstName: string; lastName: string; specialties: { id: number; name: string }[] };

describe('005 Catálogo de veterinários: critérios de aceite', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  const vet = async (firstName: string, lastName: string, specialtyIds: number[] = []) =>
    (await t.api.post('/api/admin/vets').set(idem()).send({ firstName, lastName, specialtyIds }).expect(201))
      .body as {
      id: number;
      version: number;
    };
  const catalog = async (q = '') => (await t.api.get(`/api/vets${q}`).expect(200)).body as VetCatalogOutput;
  // Especialidades da carga do teste: 1 Radiologia, 2 Cirurgia, 3 Odontologia.

  it('005/CA-1.1 a lista traz nome, sobrenome e especialidades', async () => {
    await vet('Helena', 'Costa', [1]);
    expect((await catalog()).items[0]).toEqual({
      id: expect.any(Number),
      firstName: 'Helena',
      lastName: 'Costa',
      specialties: [{ id: 1, name: 'Radiologia' }],
    });
  });

  it('005/CA-1.2 as especialidades vêm em ordem alfabética', async () => {
    await vet('Helena', 'Costa', [1, 3, 2]);
    expect((await catalog()).items[0]?.specialties.map((s) => s.name)).toEqual([
      'Cirurgia',
      'Odontologia',
      'Radiologia',
    ]);
  });

  it('005/CA-1.3 sem especialidade, a lista indica explicitamente (lista vazia e texto no front)', async () => {
    await vet('Rui', 'Lima');
    expect((await catalog()).items[0]?.specialties).toEqual([]);
    const pt = JSON.parse(readRepo('apps/web/src/i18n/messages/pt-BR.json'));
    expect(pt.vets.noSpecialty).toBe('Sem especialidade');
  });

  it('005/CA-1.4 a consulta não altera nada', async () => {
    await vet('Rui', 'Lima', [2]);
    const before = (await testDb.sql.query('select * from vets')).rows;
    await catalog();
    expect((await testDb.sql.query('select * from vets')).rows).toEqual(before);
  });

  it('005/CA-2.1 percorrer as páginas mostra cada veterinário uma vez só', async () => {
    for (let i = 0; i < 13; i++) await vet(`Nome${i}`, i % 2 ? 'Silva' : 'Souza');
    const ids: number[] = [];
    for (let page = 1; page <= 3; page++)
      ids.push(...(await catalog(`?page=${page}&pageSize=5`)).items.map((v) => v.id));
    expect(ids).toHaveLength(13);
    expect(new Set(ids).size).toBe(13);
  });

  it('005/CA-2.2 a ordem é sobrenome e depois nome, ignorando caixa e acento, estável (P-07)', async () => {
    await vet('bruno', 'Álvares');
    await vet('Ana', 'alvares');
    await vet('Carla', 'Abreu');
    await vet('Davi', 'Zé');
    const order = (await catalog()).items.map((v) => `${v.firstName} ${v.lastName}`);
    expect(order).toEqual(['Carla Abreu', 'Ana alvares', 'bruno Álvares', 'Davi Zé']);
    expect((await catalog()).items.map((v) => v.id)).toEqual((await catalog()).items.map((v) => v.id));
  });

  it('005/CA-2.3 página fora da faixa leva à primeira', async () => {
    for (let i = 0; i < 6; i++) await vet(`N${i}`, 'Lima');
    for (const page of ['0', '99', 'x']) expect((await catalog(`?page=${page}&pageSize=5`)).page).toBe(1);
  });

  it('005/CA-3.1 incluir ou alterar aparece na consulta seguinte, sem reiniciar', async () => {
    const v = await vet('Rui', 'Lima');
    expect((await catalog()).items).toHaveLength(1);
    await t.api
      .patch(`/api/admin/vets/${v.id}`)
      .set(idem())
      .send({ version: v.version, lastName: 'Lemos' })
      .expect(200);
    expect((await catalog()).items[0]?.lastName).toBe('Lemos');
  });

  it('005/CA-3.2 incluir um veterinário e vê-lo na requisição imediatamente posterior', async () => {
    await catalog();
    await vet('Novo', 'Vet');
    expect((await catalog()).items.map((v) => v.lastName)).toContain('Vet');
  });

  it('005/CA-4.1 o catálogo é entregue como dado com os campos acordados', async () => {
    await vet('Rui', 'Lima', [1]);
    const res = await t.api.get('/api/vets').expect(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(VetCatalogOutput.strict().parse(res.body)).toBeTruthy();
  });

  it('005/CA-4.2 a resposta é paginada e o limite vale com volume maior que a carga inicial', async () => {
    await testDb.sql.query(
      "insert into vets (first_name, last_name, updated_at) select 'N' || g, 'Vet' || lpad(g::text, 4, '0'), now() from generate_series(1, 120) g",
    );
    const res = await catalog('?pageSize=50');
    expect(res.items).toHaveLength(50);
    expect(res.total).toBe(120);
    expect((await catalog()).items).toHaveLength(10);
    await t.api.get('/api/vets?pageSize=500').expect(422);
  });

  it('005/CA-4.3 a resposta do catálogo não traz campo de estado de persistência', async () => {
    await vet('Rui', 'Lima', [1]);
    const body = JSON.stringify((await t.api.get('/api/vets')).body);
    expect(body).not.toMatch(PERSISTENCE);
    for (const v of (await catalog()).items as Vet[])
      expect(Object.keys(v).sort()).toEqual(['firstName', 'id', 'lastName', 'specialties']);
  });

  it('005/CA-5.1 nenhuma resposta de dado do sistema traz estado de persistência', async () => {
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput())).body;
    const bodies = await Promise.all(
      [
        '/api/owners',
        `/api/owners/${o.id}`,
        `/api/owners/${o.id}/record`,
        `/api/owners/${o.id}/pets/${p.id}`,
        `/api/owners/${o.id}/pets/${p.id}/visits`,
        '/api/species',
        '/api/vets',
      ].map(async (u) => JSON.stringify((await t.api.get(u).expect(200)).body)),
    );
    for (const b of bodies) expect(b).not.toMatch(PERSISTENCE);
  });

  it('005/CA-5.2 o "é novo" é a ausência de id e não chega à serialização (P4)', async () => {
    // O schema estrito do contrato recusa qualquer campo a mais: nenhum predicado de persistência
    // sai na resposta, nem no cadastro (sem id antes) nem na leitura (com id depois).
    const o = await anOwner(t);
    expect(OwnerOutput.strict().safeParse((await t.api.get(`/api/owners/${o.id}`)).body).success).toBe(true);
    const p = (await postPet(t, o.id, aPetInput()).expect(201)).body;
    expect(PetOutput.strict().safeParse(p).success).toBe(true);
    const a = (
      await t.api
        .post(`/api/owners/${o.id}/pets/${p.id}/appointments`)
        .set(idem())
        .send({ scheduledAt: '2026-11-01T10:00:00-03:00', description: 'x' })
        .expect(201)
    ).body;
    expect(AppointmentOutput.strict().safeParse(a).success).toBe(true);
  });

  it('005/CA-6.1 o catálogo tem um formato só, JSON (D22, D31)', async () => {
    const res = await t.api.get('/api/vets').set('Accept', 'application/json').expect(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('005/CA-6.2 pedido de outro formato recebe recusa explícita', async () => {
    const res = await t.api.get('/api/vets').set('Accept', 'application/xml');
    expect(res.status).toBe(406);
    expect(res.body).toEqual({ error: { code: 'unsupported_format' } });
  });
});
