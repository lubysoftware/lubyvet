import { NotFound } from '../../src/shared/domain/errors';
import { ListVetPatients } from '../../src/modules/vets/application/list-vet-patients.use-case';
import { AnonymizationController } from '../../src/modules/owners/interface/http/anonymization.controller';
import { OwnersController } from '../../src/modules/owners/interface/http/owners.controller';
import { anOwnerInput } from '../builders/owner.builder';
import request from 'supertest';
import { Account } from '../../src/modules/identity/domain/account';
import { InvalidCredentials, Login } from '../../src/modules/identity/application/login.use-case';
import { FixedClock } from '../../src/shared/domain/clock';
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
  beforeEach(async () => {
    t.clock.set('2026-10-07T12:00:00-03:00');
    await testDb.truncate();
  });
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

  it('011/CA-2.3 a regra de fronteira recusa interface importando porta, e o código atual passa nela', () => {
    interface Rule {
      name: string;
      from: { path: string };
      to: { path: string };
    }
    const config = jest.requireActual<{ forbidden: Rule[] }>('../../.dependency-cruiser.cjs');
    const rule = config.forbidden.find((r) => r.name === 'interface-calls-use-cases');
    expect(rule).toBeDefined();
    const hits = (from: string, to: string) =>
      new RegExp(rule?.from.path ?? '$^').test(from) && new RegExp(rule?.to.path ?? '$^').test(to);
    expect(
      hits(
        'src/modules/vets/interface/http/vets.controller.ts',
        'src/modules/vets/application/ports/vet-catalog.port.ts',
      ),
    ).toBe(true);
    expect(
      hits(
        'src/modules/identity/interface/http/auth.guard.ts',
        'src/modules/identity/application/ports/identity.port.ts',
      ),
    ).toBe(true);
    expect(
      hits(
        'src/modules/vets/interface/http/vets.controller.ts',
        'src/modules/vets/application/list-vet-patients.use-case.ts',
      ),
    ).toBe(false);
    expect(
      hits(
        'src/modules/vets/infra/prisma-vet-patients.ts',
        'src/modules/vets/application/ports/vet-catalog.port.ts',
      ),
    ).toBe(false);
  });

  it('011/CA-1.1 o bloqueio por tentativas é regra do domínio, e a API segue o que ele decide', async () => {
    const login = (password: string) =>
      request(t.http).post('/api/session').send({ login: 'reader@lubyvet.test', password });
    for (let i = 0; i < 5; i++) await login('errada').expect(401);
    await login('senha-de-teste-123').expect(401);
    t.clock.set('2026-10-07T12:15:00-03:00');
    await login('senha-de-teste-123').expect(200);
    const locked = Account.restore({
      id: 3,
      status: 'active',
      failedAttempts: 5,
      lockedUntil: new Date('2026-10-07T15:15:00Z'),
    });
    expect(locked.canTry(new Date('2026-10-07T15:14:59Z'))).toBe(false);
    expect(locked.canTry(new Date('2026-10-07T15:15:00Z'))).toBe(true);
  });

  it('011/CA-1.2 o login só orquestra: lê pela porta, pede a decisão à conta e grava o resultado', async () => {
    const now = '2026-10-07T12:00:00Z';
    const user = {
      id: 7,
      name: 'Rui',
      role: 'reader' as const,
      status: 'active',
      passwordHash: 'h',
      failedAttempts: 4,
      lockedUntil: null,
    };
    const users = {
      byLogin: jest.fn(async () => user),
      byId: jest.fn(),
      recordFailure: jest.fn(),
      recordSuccess: jest.fn(),
    };
    const verify = jest.fn(async (_h: string, p: string) => p === 'certa');
    const sessions = { create: jest.fn(async () => 'tok'), touch: jest.fn(), destroy: jest.fn() };
    const login = new Login(users, sessions, { verify }, FixedClock.at(now));
    await expect(login.execute('rui', 'errada')).rejects.toBeInstanceOf(InvalidCredentials);
    const expected = Account.restore(user).attempt(false, new Date(now));
    expect(users.recordFailure).toHaveBeenCalledWith(
      7,
      5,
      expected.outcome === 'refused' ? expected.lockedUntil : null,
    );
    users.byLogin.mockResolvedValue({
      ...user,
      failedAttempts: 5,
      lockedUntil: new Date('2026-10-07T12:15:00Z'),
    } as never);
    verify.mockClear();
    await expect(login.execute('rui', 'certa')).rejects.toBeInstanceOf(InvalidCredentials);
    expect(verify).not.toHaveBeenCalled();
    expect(sessions.create).not.toHaveBeenCalled();
  });
});
