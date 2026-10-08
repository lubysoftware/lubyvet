import { FixedClock } from '../../../shared/domain/clock';
import { FieldRuleViolation } from '../../../shared/domain/errors';
import { Owner } from '../domain/owner';
import { OwnerNotFound, SimilarOwnerFound } from '../domain/owner.errors';
import { GetOwner } from './get-owner.use-case';
import type { OwnerRepository } from './ports/owner-repository.port';
import { RegisterOwner } from './register-owner.use-case';

const fields = {
  firstName: 'Mariana',
  lastName: 'Teixeira',
  address: 'Rua A, 1',
  city: 'São Paulo',
  telephone: '(11) 98765-4321',
  cpf: '529.982.247-25',
  messagingConsent: true,
};

function memoryRepo(): OwnerRepository & { rows: Owner[]; received: Owner[] } {
  const rows: Owner[] = [];
  const received: Owner[] = [];
  const byPhone = (tel: string) =>
    rows
      .filter((r) => r.telephone === tel)
      .map((r) => ({ id: r.id ?? 0, firstName: 'Mariana', lastName: 'Teixeira', city: 'São Paulo' }));
  return {
    rows,
    received,
    insert: async (o) => {
      received.push(o);
      const saved = Owner.restore({
        ...o.snapshot(),
        id: rows.length + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      rows.push(saved);
      return saved;
    },
    findById: async (id) => rows.find((r) => r.id === id) ?? null,
    update: async (o) => o,
    findByTelephone: async (tel) => byPhone(tel),
  };
}

describe('RegisterOwner', () => {
  const clock = FixedClock.at('2026-10-07T12:00:00-03:00');

  it('UT-001-1: grava o dono e devolve com identificador vindo do armazenamento', async () => {
    const repo = memoryRepo();
    const owner = await new RegisterOwner(repo, clock).execute(fields);
    expect(owner.id).toBe(1);
    expect(owner.snapshot().messagingConsentAt).toEqual(clock.now());
  });

  it('UT-001-6: não grava nada quando a validação recusa', async () => {
    const repo = memoryRepo();
    await expect(new RegisterOwner(repo, clock).execute({ ...fields, city: '' })).rejects.toBeInstanceOf(
      FieldRuleViolation,
    );
    expect(repo.rows).toHaveLength(0);
  });
});

describe('GetOwner', () => {
  it('devolve o dono ou "não encontrado"', async () => {
    const repo = memoryRepo();
    await new RegisterOwner(repo, FixedClock.at('2026-10-07T12:00:00Z')).execute(fields);
    await expect(new GetOwner(repo).execute(1)).resolves.toBeInstanceOf(Owner);
    await expect(new GetOwner(repo).execute(99)).rejects.toBeInstanceOf(OwnerNotFound);
  });
});

describe('RegisterOwner: dono parecido (D14)', () => {
  const clock = FixedClock.at('2026-10-07T12:00:00-03:00');

  it('apresenta o candidato antes de gravar quando o celular já existe (CA-3.1)', async () => {
    const repo = memoryRepo();
    await new RegisterOwner(repo, clock).execute(fields);
    await expect(
      new RegisterOwner(repo, clock).execute({ ...fields, cpf: '111.444.777-35' }),
    ).rejects.toBeInstanceOf(SimilarOwnerFound);
    expect(repo.rows).toHaveLength(1);
  });

  it('com a confirmação explícita, grava e registra que o aviso foi dispensado (CA-3.2)', async () => {
    const repo = memoryRepo();
    await new RegisterOwner(repo, clock).execute(fields);
    const second = await new RegisterOwner(repo, clock).execute({ ...fields, cpf: '111.444.777-35' }, true);
    expect(second.snapshot().similarityDismissedAt).toEqual(clock.now());
    // 012/D51: um registro por candidato apresentado.
    expect(repo.received[1]?.dismissedSimilarOwnerIds).toEqual([1]);
  });

  it('sem coincidência, grava sem aviso e sem registro de dispensa', async () => {
    const repo = memoryRepo();
    const owner = await new RegisterOwner(repo, clock).execute(fields, true);
    expect(owner.snapshot().similarityDismissedAt).toBeNull();
    expect(owner.dismissedSimilarOwnerIds).toEqual([]);
  });
});
