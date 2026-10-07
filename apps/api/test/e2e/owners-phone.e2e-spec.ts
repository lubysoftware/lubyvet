import request from 'supertest';
import { anOwnerInput } from '../builders/owner.builder';
import { bootApp, type TestApp } from '../support/app';
import { testDb } from '../support/test-db';

// 001/T021: a regra de celular com os valores fixados em D05 (CA-2.1, CA-2.3).
describe('regra de celular do dono (D05)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  it('CA-2.1: "(11) 98765-4321" é aceito e gravado como +5511987654321', async () => {
    const res = await request(t.http)
      .post('/api/owners')
      .send(anOwnerInput({ telephone: '(11) 98765-4321' }))
      .expect(201);
    expect(res.body.telephone).toBe('+5511987654321');
    const { rows } = await testDb.sql.query<{ telephone: string }>(
      'select telephone from owners where id = $1',
      [res.body.id],
    );
    expect(rows[0]?.telephone).toBe('+5511987654321');
  });

  it.each([
    ['1234567890', 'o padrão norte-americano de dez dígitos do legado'],
    ['(11) 3456-7890', 'telefone fixo'],
  ])('CA-2.3: "%s" (%s) é recusado no campo', async (telephone) => {
    const res = await request(t.http).post('/api/owners').send(anOwnerInput({ telephone })).expect(422);
    expect(res.body.error.fields).toEqual([{ path: 'telephone', code: 'invalid_phone' }]);
    expect(await testDb.count('owners')).toBe(0);
  });
});
