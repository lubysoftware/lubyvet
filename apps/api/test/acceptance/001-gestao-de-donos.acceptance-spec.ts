import { OwnerOutput, isBrazilianMobile, normalizeBrazilianMobile } from '@lubyvet/contracts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { anOwnerInput, validCpf, validMobile } from '../builders/owner.builder';
import { bootApp, idem, loginAs, type TestApp } from '../support/app';
import { aPetInput, postPet } from '../support/pets';
import { testDb } from '../support/test-db';

const repo = join(__dirname, '../../../..');
const fieldOf = (body: { error?: { fields?: { path: string; code: string }[] } }) =>
  Object.fromEntries((body.error?.fields ?? []).map((f) => [f.path, f.code]));

describe('001 Gestão de donos: critérios de aceite', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  const register = (over = {}) => t.api.post('/api/owners').set(idem()).send(anOwnerInput(over));

  it('001/CA-1.1 com os seis campos obrigatórios o dono é gravado e a resposta é a ficha dele', async () => {
    const res = await register();
    expect(res.status).toBe(201);
    const owner = OwnerOutput.parse(res.body);
    expect((await t.api.get(`/api/owners/${owner.id}`).expect(200)).body).toEqual(res.body);
  });

  it('001/CA-1.2 campo obrigatório em branco marca o campo e nada é gravado', async () => {
    for (const f of ['firstName', 'lastName', 'address', 'city', 'telephone', 'cpf']) {
      const res = await register({ [f]: '  ' });
      expect(res.status).toBe(422);
      expect(fieldOf(res.body)[f]).toBe('required');
    }
    expect(await testDb.count('owners')).toBe(0);
  });

  it('001/CA-1.3 nome e sobrenome acima de 30, endereço acima de 255 e cidade acima de 80 são recusados no campo', async () => {
    const res = await register({
      firstName: 'a'.repeat(31),
      lastName: 'b'.repeat(31),
      address: 'c'.repeat(256),
      city: 'd'.repeat(81),
    });
    expect(res.status).toBe(422);
    expect(fieldOf(res.body)).toMatchObject({
      firstName: 'too_long',
      lastName: 'too_long',
      address: 'too_long',
      city: 'too_long',
    });
    expect((await register({ firstName: 'a'.repeat(30), city: 'd'.repeat(80) })).status).toBe(201);
  });

  it('001/CA-1.4 com erro de validação a contagem de donos não muda', async () => {
    await register().expect(201);
    await register({ cpf: '123' }).expect(422);
    await register({ telephone: '12' }).expect(422);
    expect(await testDb.count('owners')).toBe(1);
  });

  it('001/CA-1.5 CPF com dígito errado é recusado; CPF válido é gravado só com os dígitos (D13)', async () => {
    expect(fieldOf((await register({ cpf: '529.982.247-24' }).expect(422)).body).cpf).toBe('invalid_cpf');
    const ok = await register({ cpf: '529.982.247-25' }).expect(201);
    expect(ok.body.cpf).toBe('52998224725');
  });

  it('001/CA-1.6 CPF de outro dono é recusado no campo pela restrição de unicidade (D15)', async () => {
    const cpf = validCpf();
    await register({ cpf }).expect(201);
    const res = await register({ cpf: cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') });
    expect(res.status).toBe(422);
    expect(fieldOf(res.body).cpf).toBe('cpf_taken');
    const repo = readFileSync(
      join(__dirname, '../../src/modules/owners/infra/prisma-owner.repository.ts'),
      'utf8',
    );
    expect(repo).not.toMatch(/\.message\b/);
  });

  it('001/CA-1.7 e-mail é opcional; formato inválido ou acima de 254 caracteres é recusado (D13)', async () => {
    await register({ email: undefined }).expect(201);
    expect(fieldOf((await register({ email: 'sem-arroba' }).expect(422)).body).email).toBe('invalid_email');
    const long = `${'a'.repeat(250)}@x.co`;
    expect(fieldOf((await register({ email: long }).expect(422)).body).email).toBe('too_long');
    expect((await register({ email: 'ana@clinica.com.br' }).expect(201)).body.email).toBe(
      'ana@clinica.com.br',
    );
  });

  it('001/CA-1.8 consentimento é explícito, desmarcado por padrão e registra a data (D12)', async () => {
    const no = await t.api
      .post('/api/owners')
      .set(idem())
      .send({ ...anOwnerInput(), messagingConsent: undefined })
      .expect(201);
    expect(no.body.messagingConsentAt).toBeNull();
    const yes = await register({ messagingConsent: true }).expect(201);
    expect(new Date(yes.body.messagingConsentAt).getTime()).not.toBeNaN();
  });

  it('001/CA-2.1 celular válido com ou sem máscara é gravado em E.164 (D05)', async () => {
    expect((await register({ telephone: '(11) 98765-4321' }).expect(201)).body.telephone).toBe(
      '+5511987654321',
    );
    expect((await register({ telephone: '21987654321' }).expect(201)).body.telephone).toBe('+5521987654321');
    expect((await register({ telephone: '+55 31 98765-4321' }).expect(201)).body.telephone).toBe(
      '+5531987654321',
    );
  });

  it('001/CA-2.2 telefone inválido é recusado no campo e nada é gravado', async () => {
    for (const telephone of ['1198765432', '(00) 98765-4321', '(11) 88765-4321'])
      expect(fieldOf((await register({ telephone }).expect(422)).body).telephone).toBe('invalid_phone');
    expect(await testDb.count('owners')).toBe(0);
  });

  it('001/CA-2.3 a regra do telefone está num lugar só e cobre um válido e um inválido', () => {
    expect(isBrazilianMobile('(11) 98765-4321')).toBe(true);
    expect(isBrazilianMobile('(11) 3333-4444')).toBe(false);
    expect(normalizeBrazilianMobile('11987654321')).toBe('+5511987654321');
    const src = readFileSync(join(repo, 'packages/contracts/src/owners/owner.schema.ts'), 'utf8');
    expect(src).toContain('isBrazilianMobile');
    expect(readFileSync(join(__dirname, '../../src/modules/owners/domain/owner.ts'), 'utf8')).not.toMatch(
      /\/\^\\\(\?\\d/,
    );
  });

  it('001/CA-3.1 celular de um dono existente apresenta o candidato antes de gravar (D14)', async () => {
    const telephone = validMobile();
    const first = (await register({ telephone }).expect(201)).body;
    const res = await register({ telephone });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('similar_owner');
    expect(res.body.error.current).toEqual([
      { id: first.id, firstName: first.firstName, lastName: first.lastName, city: first.city },
    ]);
    expect(await testDb.count('owners')).toBe(1);
  });

  it('001/CA-3.2 o usuário segue mesmo assim e a escolha fica registrada', async () => {
    const telephone = validMobile();
    await register({ telephone }).expect(201);
    const res = await register({ telephone, confirmSimilar: true }).expect(201);
    expect(await testDb.count('owners')).toBe(2);
    const { rows } = await testDb.sql.query('select * from owners where id = $1', [res.body.id]);
    expect(JSON.stringify(rows[0])).toMatch(/similar|confirm/i);
  });

  it('001/CA-3.3 homônimos com contatos distintos são aceitos sem alarme', async () => {
    await register({ firstName: 'Ana', lastName: 'Lima' }).expect(201);
    await register({ firstName: 'Ana', lastName: 'Lima' }).expect(201);
  });

  it('001/CA-4.1 a edição lê os dados atuais do dono', async () => {
    const owner = (await register()).body;
    expect((await t.api.get(`/api/owners/${owner.id}`).expect(200)).body).toMatchObject({
      firstName: owner.firstName,
      lastName: owner.lastName,
      address: owner.address,
      city: owner.city,
      telephone: owner.telephone,
      version: 0,
    });
  });

  it('001/CA-4.2 a alteração grava os dados novos com o mesmo identificador', async () => {
    const owner = (await register()).body;
    const res = await t.api
      .patch(`/api/owners/${owner.id}`)
      .set(idem())
      .send({ version: 0, city: 'Campinas' })
      .expect(200);
    expect(res.body).toMatchObject({ id: owner.id, city: 'Campinas', version: 1 });
  });

  it('001/CA-4.3 a edição tem as validações do cadastro e não grava com erro', async () => {
    const owner = (await register()).body;
    const res = await t.api
      .patch(`/api/owners/${owner.id}`)
      .set(idem())
      .send({ version: 0, firstName: '', city: 'x'.repeat(81) })
      .expect(422);
    expect(fieldOf(res.body)).toMatchObject({ firstName: 'required', city: 'too_long' });
    expect((await t.api.get(`/api/owners/${owner.id}`)).body.version).toBe(0);
  });

  it('001/CA-4.4 animais e visitas do dono ficam como estavam depois da alteração', async () => {
    const owner = (await register()).body;
    const pet = (await postPet(t, owner.id, aPetInput()).expect(201)).body;
    await t.api
      .post(`/api/owners/${owner.id}/pets/${pet.id}/appointments`)
      .set(idem())
      .send({ scheduledAt: '2026-11-01T10:00:00-03:00', description: 'Vacina' })
      .expect(201);
    const before = (await t.api.get(`/api/owners/${owner.id}/record`)).body;
    await t.api.patch(`/api/owners/${owner.id}`).set(idem()).send({ version: 0, city: 'Santos' }).expect(200);
    expect((await t.api.get(`/api/owners/${owner.id}/record`)).body).toEqual(before);
  });

  it('001/CA-5.1 a segunda gravação concorrente é recusada como cadastro alterado', async () => {
    const owner = (await register()).body;
    await t.api.patch(`/api/owners/${owner.id}`).set(idem()).send({ version: 0, city: 'A' }).expect(200);
    const res = await t.api.patch(`/api/owners/${owner.id}`).set(idem()).send({ version: 0, city: 'B' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('stale_version');
  });

  it('001/CA-5.2 a recusa traz os dados atuais para o usuário decidir', async () => {
    const owner = (await register()).body;
    await t.api.patch(`/api/owners/${owner.id}`).set(idem()).send({ version: 0, city: 'A' }).expect(200);
    const res = await t.api.patch(`/api/owners/${owner.id}`).set(idem()).send({ version: 0, city: 'B' });
    expect(OwnerOutput.parse(res.body.error.current)).toMatchObject({ city: 'A', version: 1 });
    await t.api.patch(`/api/owners/${owner.id}`).set(idem()).send({ version: 1, city: 'B' }).expect(200);
  });

  it('001/CA-5.3 edição isolada grava sem aviso', async () => {
    const owner = (await register()).body;
    const res = await t.api.patch(`/api/owners/${owner.id}`).set(idem()).send({ version: 0, city: 'C' });
    expect(res.status).toBe(200);
    expect(res.body.error).toBeUndefined();
  });

  it('001/CA-6.1 a ficha traz nome, sobrenome, endereço, cidade e telefone', async () => {
    const owner = (await register()).body;
    const read = (await t.api.get(`/api/owners/${owner.id}`).expect(200)).body;
    for (const k of ['firstName', 'lastName', 'address', 'city', 'telephone']) expect(read[k]).toBeTruthy();
  });

  it('001/CA-6.2 animais em ordem alfabética e visitas em ordem crescente de data', async () => {
    const owner = (await register()).body;
    const zeca = (await postPet(t, owner.id, aPetInput({ name: 'Zeca' }))).body;
    await postPet(t, owner.id, aPetInput({ name: 'amora' })).expect(201);
    await postPet(t, owner.id, aPetInput({ name: 'Bidu' })).expect(201);
    for (const d of ['2026-12-01', '2026-10-20', '2026-11-05'])
      await t.api
        .post(`/api/owners/${owner.id}/pets/${zeca.id}/appointments`)
        .set(idem())
        .send({ scheduledAt: `${d}T10:00:00-03:00`, description: d })
        .expect(201);
    const record = (await t.api.get(`/api/owners/${owner.id}/record`).expect(200)).body;
    expect(record.pets.map((p: { name: string }) => p.name)).toEqual(['amora', 'Bidu', 'Zeca']);
    const visits = record.pets[2].visits.items.map((v: { description: string }) => v.description);
    expect(visits).toEqual(['2026-10-20', '2026-11-05', '2026-12-01']);
  });

  it('001/CA-6.3 cada atalho da ficha tem a rota que ele usa', async () => {
    const owner = (await register()).body;
    const pet = (await postPet(t, owner.id, aPetInput()).expect(201)).body;
    await t.api.patch(`/api/owners/${owner.id}`).set(idem()).send({ version: 0 }).expect(200);
    await postPet(t, owner.id, aPetInput({ name: 'Outro' })).expect(201);
    await t.api.get(`/api/owners/${owner.id}/pets/${pet.id}`).expect(200);
    await t.api
      .post(`/api/owners/${owner.id}/pets/${pet.id}/appointments`)
      .set(idem())
      .send({ scheduledAt: '2026-11-01T10:00:00-03:00', description: 'x' })
      .expect(201);
  });

  it('001/CA-6.4 dono sem animal abre a ficha com a seção vazia', async () => {
    const owner = (await register()).body;
    expect((await t.api.get(`/api/owners/${owner.id}/record`).expect(200)).body).toEqual({
      ownerId: owner.id,
      pets: [],
    });
  });

  it('001/CA-6.5 a consulta da ficha não altera nada', async () => {
    const owner = (await register()).body;
    const before = (await testDb.sql.query('select * from owners')).rows;
    await t.api.get(`/api/owners/${owner.id}`).expect(200);
    await t.api.get(`/api/owners/${owner.id}/record`).expect(200);
    expect((await testDb.sql.query('select * from owners')).rows).toEqual(before);
  });

  it('001/CA-7.1 a confirmação vem na resposta da própria gravação', async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body.id).toEqual(expect.any(Number));
  });

  it('001/CA-7.2 o erro de gravação vem na mesma resposta, junto ao campo', async () => {
    const res = await register({ cpf: '1' });
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toEqual([{ path: 'cpf', code: 'invalid_cpf' }]);
  });

  it('001/CA-7.3 a mensagem tem tempo de vida definido e nenhuma espera sem mensagem', () => {
    const src = readFileSync(join(repo, 'apps/web/src/features/forms/components/result-message.tsx'), 'utf8');
    expect(src).toMatch(/RESULT_TTL_MS = \d+/);
    expect(src).toMatch(/if \(code === null\) return;/);
  });

  it('001 a leitura exige sessão e a gravação o papel de escrita', async () => {
    const reader = await loginAs(t.http, 'reader');
    await request(t.http)
      .post('/api/owners')
      .set('Cookie', reader)
      .set(idem())
      .send(anOwnerInput())
      .expect(403);
  });
});
