import { NotFound } from '../../src/shared/domain/errors';
import { ListVetPatients } from '../../src/modules/vets/application/list-vet-patients.use-case';
import { AnonymizationController } from '../../src/modules/owners/interface/http/anonymization.controller';
import { OwnersController } from '../../src/modules/owners/interface/http/owners.controller';
import { anOwnerInput } from '../builders/owner.builder';
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

  it('011/CA-2.2 anonimização e revisão de texto livre ficam num controller próprio, com as mesmas rotas', async () => {
    const own = Object.getOwnPropertyNames(AnonymizationController.prototype);
    expect(own).toEqual(expect.arrayContaining(['anonymize', 'freeText', 'redact']));
    const owners = Object.getOwnPropertyNames(OwnersController.prototype);
    expect(owners.filter((m) => ['anonymize', 'freeText', 'redact'].includes(m))).toEqual([]);
    const o = (await t.api.post('/api/owners').set(idem()).send(anOwnerInput()).expect(201)).body;
    expect((await t.api.post(`/api/owners/${o.id}/anonymize`).set(idem()).send({}).expect(200)).body).toEqual(
      {
        pendingReview: 0,
      },
    );
  });
});
