import { anOwnerInput } from '../builders/owner.builder';
import { bootApp, idem, type TestApp } from '../support/app';
import { testDb } from '../support/test-db';

// 001/T008: UT-001-1 a UT-001-7 e UT-002-1 a UT-002-3, pela rota até o banco (P6).
describe('criação de dono', () => {
  let t: TestApp;
  const post = (body: unknown) =>
    t.api
      .post('/api/owners')
      .set(idem())
      .send(body as object);
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  it('UT-001-1: caminho feliz grava os cinco campos de contato', async () => {
    const input = anOwnerInput({
      firstName: 'Beatriz',
      lastName: 'Nogueira',
      address: 'Rua das Flores, 10',
      city: 'Guarulhos',
    });
    const res = await post(input).expect(201);
    expect(res.body).toMatchObject({
      firstName: 'Beatriz',
      lastName: 'Nogueira',
      address: 'Rua das Flores, 10',
      city: 'Guarulhos',
    });
    expect(await testDb.count('owners')).toBe(1);
  });

  it.each(['firstName', 'lastName', 'address', 'city', 'telephone'] as const)(
    'UT-001-2: %s ausente é recusado no próprio campo',
    async (field) => {
      const input = Object.fromEntries(Object.entries(anOwnerInput()).filter(([k]) => k !== field));
      const res = await post(input).expect(422);
      expect(res.body.error.fields).toEqual([{ path: field, code: 'required' }]);
    },
  );

  it.each(['firstName', 'lastName', 'address', 'city'] as const)(
    'UT-001-3: %s em branco é recusado como obrigatório',
    async (field) => {
      const res = await post(anOwnerInput({ [field]: '   ' })).expect(422);
      expect(res.body.error.fields).toEqual([{ path: field, code: 'required' }]);
    },
  );

  it.each([
    ['firstName', 30],
    ['lastName', 30],
    ['address', 255],
    ['city', 80],
  ] as const)('UT-001-4/5: %s aceita %i caracteres e recusa um a mais', async (field, max) => {
    await post(anOwnerInput({ [field]: 'a'.repeat(max) })).expect(201);
    const res = await post(anOwnerInput({ [field]: 'a'.repeat(max + 1) })).expect(422);
    expect(res.body.error.fields).toEqual([{ path: field, code: 'too_long' }]);
  });

  it('UT-001-6: com erro de validação, a contagem de donos não muda', async () => {
    await post(anOwnerInput()).expect(201);
    await post(anOwnerInput({ city: '' })).expect(422);
    await post(anOwnerInput({ telephone: '123' })).expect(422);
    expect(await testDb.count('owners')).toBe(1);
  });

  it('UT-001-7: depois de gravar, o destino é a ficha do dono criado', async () => {
    const { body } = await post(anOwnerInput()).expect(201);
    const ficha = await t.api.get(`/api/owners/${body.id}`).expect(200);
    expect(ficha.body.id).toBe(body.id);
  });

  it('UT-002-1: telefone válido é gravado', async () => {
    const res = await post(anOwnerInput({ telephone: '(21) 99123-0045' })).expect(201);
    expect(res.body.telephone).toBe('+5521991230045');
  });

  it('UT-002-2/3: telefone inválido é recusado no próprio campo e nada é gravado', async () => {
    const res = await post(anOwnerInput({ telephone: '1234567890' })).expect(422);
    expect(res.body.error.fields).toEqual([{ path: 'telephone', code: 'invalid_phone' }]);
    expect(await testDb.count('owners')).toBe(0);
  });
});
