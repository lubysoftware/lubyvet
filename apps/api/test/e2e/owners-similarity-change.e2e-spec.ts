import request from 'supertest';
import { anOwnerInput } from '../builders/owner.builder';
import { bootApp, idem, type TestApp } from '../support/app';
import { testDb } from '../support/test-db';

// 001/T022: aviso de dono parecido pelo celular, no cadastro e na alteração (D14, CA-3.1, CA-3.3).
describe('aviso de dono parecido na alteração', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });
  const create = async (over = {}) =>
    (await request(t.http).post('/api/owners').set(idem()).send(anOwnerInput(over)).expect(201)).body;

  it('trocar para o celular de outro dono apresenta o candidato antes de gravar', async () => {
    const mariana = await create({ telephone: '(11) 98765-4321' });
    const marcos = await create({ telephone: '(21) 99123-0045' });
    const res = await request(t.http)
      .patch(`/api/owners/${marcos.id}`)
      .set(idem())
      .send({ version: marcos.version, telephone: '(11) 98765-4321' })
      .expect(409);
    expect(res.body.error.code).toBe('similar_owner');
    expect(res.body.error.current).toEqual([expect.objectContaining({ id: mariana.id })]);
    expect((await request(t.http).get(`/api/owners/${marcos.id}`)).body.telephone).toBe('+5521991230045');
  });

  it('com a confirmação, a alteração grava', async () => {
    await create({ telephone: '(11) 98765-4321' });
    const marcos = await create({ telephone: '(21) 99123-0045' });
    const res = await request(t.http)
      .patch(`/api/owners/${marcos.id}`)
      .set(idem())
      .send({ version: marcos.version, telephone: '(11) 98765-4321', confirmSimilar: true })
      .expect(200);
    expect(res.body.telephone).toBe('+5511987654321');
  });

  it('manter o próprio celular, ou mudar outro campo, não dispara aviso', async () => {
    const mariana = await create({ telephone: '(11) 98765-4321' });
    await request(t.http)
      .patch(`/api/owners/${mariana.id}`)
      .set(idem())
      .send({ version: mariana.version, telephone: '11987654321', city: 'Campinas' })
      .expect(200);
  });
});
