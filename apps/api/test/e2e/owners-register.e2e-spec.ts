import request from 'supertest';
import { OwnerOutput } from '@lubyvet/contracts';
import { anOwnerInput } from '../builders/owner.builder';
import { bootApp, idem, type TestApp } from '../support/app';
import { testDb } from '../support/test-db';

describe('POST /api/owners (001/US-1)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  it('cria o dono e devolve a ficha no formato do contrato', async () => {
    const res = await request(t.http)
      .post('/api/owners')
      .set(idem())
      .send(anOwnerInput({ telephone: '(11) 98765-4321' }));
    expect(res.status).toBe(201);
    const body = OwnerOutput.strict().parse(res.body);
    expect(body.telephone).toBe('+5511987654321');
    const read = await request(t.http).get(`/api/owners/${body.id}`);
    expect(read.status).toBe(200);
    expect(read.body).toEqual(body);
  });

  it('CPF repetido vira erro do campo cpf, reconhecido pela restrição (D15, P6)', async () => {
    const first = anOwnerInput();
    await request(t.http).post('/api/owners').set(idem()).send(first).expect(201);
    const res = await request(t.http)
      .post('/api/owners')
      .set(idem())
      .send(anOwnerInput({ cpf: first.cpf }));
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error: { code: 'validation_failed', fields: [{ path: 'cpf', code: 'cpf_taken' }] },
    });
  });

  it('identificador inexistente ou malformado responde 404', async () => {
    expect((await request(t.http).get('/api/owners/999')).body).toEqual({
      error: { code: 'owner_not_found' },
    });
    expect((await request(t.http).get('/api/owners/abc')).status).toBe(404);
  });
});
