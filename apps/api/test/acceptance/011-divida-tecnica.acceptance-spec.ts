import { NotFound } from '../../src/shared/domain/errors';
import { ListVetPatients } from '../../src/modules/vets/application/list-vet-patients.use-case';
import { bootApp, idem, type TestApp } from '../support/app';
import { testDb } from '../support/test-db';

/**
 * 011: dívida técnica. Nenhum comportamento muda; estes testes provam a forma nova (casos de uso,
 * domínio, eventos) sobre a aplicação inteira, ao lado das suítes de 001 a 010 que não mudam.
 */
describe('011 Dívida técnica: critérios de aceite', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp('2026-10-07T12:00:00-03:00');
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });

  it('011/CA-2.1 os animais atendidos por um veterinário passam por um caso de uso, que decide o não encontrado', async () => {
    const useCase = t.app.get(ListVetPatients);
    await expect(useCase.execute(999_999)).rejects.toBeInstanceOf(NotFound);
    const vet = (
      await t.api.post('/api/admin/vets').set(idem()).send({ firstName: 'Helena', lastName: 'Costa' })
    ).body;
    await expect(useCase.execute(vet.id)).resolves.toEqual([]);
    expect((await t.api.get('/api/vets/999999/patients')).body).toEqual({ error: { code: 'vet_not_found' } });
  });
});
