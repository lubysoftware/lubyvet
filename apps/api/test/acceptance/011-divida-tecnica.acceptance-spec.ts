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
import { listRepo, readRepo } from '../support/structural';
import { testDb } from '../support/test-db';
import type { DomainEvent } from '../../src/shared/domain/events';
import { InProcessEvents } from '../../src/shared/infra/in-process-events';
import { countersFor } from '../../src/shared/infra/metrics-subscriber';
import { aPetInput, postPet } from '../support/pets';

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

  it('011/CA-1.3 operations e vocabularies ficam sem domínio de propósito, com o motivo escrito', () => {
    const folders = (m: string) => listRepo(`apps/api/src/modules/${m}`).map((f) => f.split('/').pop());
    expect(folders('operations')).not.toContain('domain');
    expect(folders('vocabularies')).not.toContain('domain');
    expect(folders('identity')).toContain('domain');
    const doc = readRepo('docs/padroes/arquitetura.md');
    expect(doc).toMatch(/Módulo sem `domain\/`, de propósito/);
    expect(doc).toMatch(/`operations` e `vocabularies` não têm pasta de\s+domínio/);
  });

  const record = () => {
    const seen: DomainEvent[] = [];
    t.app.get(InProcessEvents).subscribe((e) => void seen.push(e));
    return seen;
  };

  it('011/CA-3.1 os casos de uso publicam eventos de domínio, só com ids e tipos', async () => {
    const seen = record();
    const o = (await t.api.post('/api/owners').set(idem()).send(anOwnerInput()).expect(201)).body;
    const p = (await postPet(t, o.id, aPetInput()).expect(201)).body;
    const a = (
      await t.api
        .post(`/api/owners/${o.id}/pets/${p.id}/appointments`)
        .set(idem())
        .send({ scheduledAt: '2026-10-20T10:00:00-03:00', description: 'Vacina Mariana' })
        .expect(201)
    ).body;
    expect(seen.map((e) => e.type)).toEqual(['owner_registered', 'pet_registered', 'appointment_scheduled']);
    expect(seen).toContainEqual({ type: 'appointment_scheduled', appointmentId: a.id });
    expect(JSON.stringify(seen)).not.toMatch(/Mariana|Vacina|\+55/);
  });

  it('011/CA-3.2 nenhum módulo conta métrica: só o assinante, pela regra de fronteira', () => {
    interface Rule {
      name: string;
      from: { path: string };
      to: { path: string };
    }
    const rule = jest
      .requireActual<{ forbidden: Rule[] }>('../../.dependency-cruiser.cjs')
      .forbidden.find((r) => r.name === 'metrics-only-from-events');
    expect(
      new RegExp(rule?.from.path ?? '$^').test('src/modules/visits/application/visits.use-cases.ts'),
    ).toBe(true);
    expect(new RegExp(rule?.to.path ?? '$^').test('src/shared/domain/metrics.ts')).toBe(true);
    expect(new RegExp(rule?.from.path ?? '$^').test('src/shared/infra/metrics-subscriber.ts')).toBe(false);
  });

  it('011/CA-3.3 recusa e conflito não publicam evento de gravação', async () => {
    const seen = record();
    await t.api
      .post('/api/owners')
      .set(idem())
      .send(anOwnerInput({ cpf: '1' }))
      .expect(422);
    const o = (await t.api.post('/api/owners').set(idem()).send(anOwnerInput()).expect(201)).body;
    await t.api.patch(`/api/owners/${o.id}`).set(idem()).send({ version: 0, city: 'A' }).expect(200);
    await t.api.patch(`/api/owners/${o.id}`).set(idem()).send({ version: 0, city: 'B' }).expect(409);
    await postPet(t, 999_999, aPetInput()).expect(404);
    expect(seen.map((e) => e.type)).toEqual(['owner_registered']);
  });

  it('011/CA-3.4 os eventos viram exatamente as métricas e os rótulos de D27 que a 008 confere', () => {
    const all: DomainEvent[] = [
      { type: 'owner_registered', ownerId: 1 },
      { type: 'similar_owner_warned' },
      { type: 'similar_owner_dismissed' },
      { type: 'owner_anonymized', ownerId: 1 },
      { type: 'pet_registered', petId: 1 },
      { type: 'appointment_scheduled', appointmentId: 1 },
      { type: 'appointment_cancelled', appointmentId: 1 },
      { type: 'appointment_no_show', appointmentId: 1 },
      { type: 'encounter_recorded', encounterId: 1, vetId: 4, returnSuggested: true },
      { type: 'whatsapp_enqueued', outboxId: 1 },
      { type: 'whatsapp_sent', outboxId: 1, kind: 'confirmation' },
      { type: 'whatsapp_skipped_no_consent', outboxId: 1, kind: 'reminder' },
      { type: 'whatsapp_failed', outboxId: 1 },
    ];
    expect(
      all
        .flatMap(countersFor)
        .map(([name]) => name)
        .sort(),
    ).toEqual(
      [
        'appointments_cancelled',
        'appointments_created',
        'appointments_no_show',
        'encounters_recorded',
        'owners_anonymized',
        'owners_created',
        'pets_created',
        'returns_suggested',
        'similar_owner_dismissed',
        'similar_owner_shown',
        'whatsapp_enqueued',
        'whatsapp_failed',
        'whatsapp_sent',
        'whatsapp_skipped_no_consent',
      ].sort(),
    );
    expect(countersFor(all[8] as DomainEvent)[0]).toEqual(['encounters_recorded', { vet_id: '4' }]);
  });
});
