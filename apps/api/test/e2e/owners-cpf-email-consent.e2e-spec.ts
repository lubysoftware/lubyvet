import request from 'supertest';
import { anOwnerInput, validCpf } from '../builders/owner.builder';
import { bootApp, idem, type TestApp } from '../support/app';
import { testDb } from '../support/test-db';

// 001/T020: CPF, e-mail e consentimento (CA-1.5 a CA-1.8; D12, D13, D15).
describe('CPF, e-mail e consentimento do dono', () => {
  let t: TestApp;
  const post = (body: object) => request(t.http).post('/api/owners').set(idem()).send(body);
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  it('CA-1.5: CPF válido é gravado só com os dígitos', async () => {
    const res = await post(anOwnerInput({ cpf: '529.982.247-25' })).expect(201);
    expect(res.body.cpf).toBe('52998224725');
  });

  it('CA-1.5: CPF com dígito verificador errado é recusado no campo', async () => {
    const res = await post(anOwnerInput({ cpf: '529.982.247-24' })).expect(422);
    expect(res.body.error.fields).toEqual([{ path: 'cpf', code: 'invalid_cpf' }]);
  });

  it('CA-1.6: CPF repetido é recusado, inclusive em gravações simultâneas contra o banco real', async () => {
    const cpf = validCpf(4242);
    const results = await Promise.all([
      post(anOwnerInput({ cpf })),
      post(anOwnerInput({ cpf })),
      post(anOwnerInput({ cpf })),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 422, 422]);
    expect(await testDb.count('owners', { cpf })).toBe(1);
  });

  it('D15: o CPF de um dono anonimizado (cpf nulo) fica livre para outro cadastro', async () => {
    const cpf = validCpf(777);
    const { body } = await post(anOwnerInput({ cpf })).expect(201);
    await testDb.sql.query('update owners set cpf = null where id = $1', [body.id]);
    await post(anOwnerInput({ cpf })).expect(201);
  });

  it('CA-1.7: e-mail é opcional; quando informado, formato e tamanho valem', async () => {
    await post(anOwnerInput()).expect(201);
    const ok = await post(anOwnerInput({ email: 'mariana@exemplo.com.br' })).expect(201);
    expect(ok.body.email).toBe('mariana@exemplo.com.br');
    const at254 = `${'a'.repeat(242)}@exemplo.com`;
    expect(at254).toHaveLength(254);
    await post(anOwnerInput({ email: at254 })).expect(201);
    const over = await post(anOwnerInput({ email: `${'a'.repeat(243)}@exemplo.com` })).expect(422);
    expect(over.body.error.fields).toEqual([{ path: 'email', code: 'too_long' }]);
    const bad = await post(anOwnerInput({ email: 'sem-arroba' })).expect(422);
    expect(bad.body.error.fields).toEqual([{ path: 'email', code: 'invalid_email' }]);
  });

  it('CA-1.8: o consentimento é desmarcado por padrão e registra a data quando dado', async () => {
    const { messagingConsent: _ignored, ...withoutConsent } = anOwnerInput();
    const off = await post(withoutConsent).expect(201);
    expect(off.body.messagingConsentAt).toBeNull();
    const on = await post(anOwnerInput({ messagingConsent: true })).expect(201);
    expect(on.body.messagingConsentAt).toBe(new Date('2026-10-07T12:00:00-03:00').toISOString());
  });
});
