import { OwnerOutput } from '@lubyvet/contracts';
import { anOwnerInput } from '../builders/owner.builder';
import { bootApp, idem, type TestApp } from '../support/app';
import { testDb } from '../support/test-db';

// 001/T011: marca de versão e recusa de gravação com versão vencida (US-5).
describe('edição concorrente do dono', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  it('CA-5.1/5.2: a segunda gravação com a mesma versão é recusada e recebe os valores atuais', async () => {
    const owner = (
      await t.api
        .post('/api/owners')
        .set(idem())
        .send(anOwnerInput({ city: 'São Paulo' }))
        .expect(201)
    ).body;
    await t.api
      .patch(`/api/owners/${owner.id}`)
      .set(idem())
      .send({ version: owner.version, city: 'Campinas' })
      .expect(200);
    const res = await t.api
      .patch(`/api/owners/${owner.id}`)
      .set(idem())
      .send({ version: owner.version, city: 'Santos' })
      .expect(409);
    expect(res.body.error.code).toBe('stale_version');
    const current = OwnerOutput.strict().parse(res.body.error.current);
    expect(current).toMatchObject({ city: 'Campinas', version: owner.version + 1 });
    expect((await t.api.get(`/api/owners/${owner.id}`)).body.city).toBe('Campinas');
  });

  it('CA-5.3: edição isolada grava normalmente, sem aviso', async () => {
    const owner = (await t.api.post('/api/owners').set(idem()).send(anOwnerInput()).expect(201)).body;
    const first = await t.api
      .patch(`/api/owners/${owner.id}`)
      .set(idem())
      .send({ version: owner.version, city: 'Campinas' })
      .expect(200);
    await t.api
      .patch(`/api/owners/${owner.id}`)
      .set(idem())
      .send({ version: first.body.version, city: 'Santos' })
      .expect(200);
  });
});
