import request from 'supertest';
import { anOwnerInput } from '../builders/owner.builder';
import { bootApp, idem, type TestApp } from '../support/app';
import { testDb } from '../support/test-db';

// 001/T018: aviso de dono parecido (D14) e dupla submissão (D16).
describe('aviso de dono parecido e dupla submissão', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });
  const post = (body: object, headers = idem()) =>
    request(t.http).post('/api/owners').set(headers).send(body);

  it('UT-003-1: mesmo celular de outro dono apresenta o candidato e não grava', async () => {
    const first = (await post(anOwnerInput({ telephone: '(11) 98765-4321' })).expect(201)).body;
    const res = await post(anOwnerInput({ telephone: '11 98765 4321' })).expect(409);
    expect(res.body.error).toEqual({
      code: 'similar_owner',
      current: [{ id: first.id, firstName: first.firstName, lastName: first.lastName, city: first.city }],
    });
    expect(await testDb.count('owners')).toBe(1);
  });

  it('UT-003-2: a coincidência é indício, não identidade: confirmar grava e registra a dispensa', async () => {
    await post(anOwnerInput({ telephone: '(11) 98765-4321' })).expect(201);
    const res = await post(anOwnerInput({ telephone: '(11) 98765-4321', confirmSimilar: true })).expect(201);
    const { rows } = await testDb.sql.query<{ similarity_dismissed_at: Date | null }>(
      'select similarity_dismissed_at from owners where id = $1',
      [res.body.id],
    );
    expect(rows[0]?.similarity_dismissed_at).toBeInstanceOf(Date);
  });

  it('UT-003-3: dois homônimos com contatos distintos são aceitos sem alarme', async () => {
    await post(anOwnerInput({ firstName: 'Ana', lastName: 'Souza' })).expect(201);
    await post(anOwnerInput({ firstName: 'Ana', lastName: 'Souza' })).expect(201);
    expect(await testDb.count('owners')).toBe(2);
  });

  it('dois envios simultâneos do mesmo formulário produzem um dono só, e a mesma resposta', async () => {
    const headers = idem();
    const body = anOwnerInput();
    const [a, b] = await Promise.all([post(body, headers), post(body, headers)]);
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(a.body).toEqual(b.body);
    expect(await testDb.count('owners')).toBe(1);
  });

  it('gravação sem a chave de idempotência é recusada', async () => {
    const res = await request(t.http).post('/api/owners').send(anOwnerInput()).expect(422);
    expect(res.body.error.code).toBe('idempotency_key_required');
  });

  it('a chave de uma gravação recusada fica livre para o formulário corrigido', async () => {
    const headers = idem();
    await post(anOwnerInput({ city: '' }), headers).expect(422);
    await post(anOwnerInput(), headers).expect(201);
  });
});
