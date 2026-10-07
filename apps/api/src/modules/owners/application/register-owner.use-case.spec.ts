import { FixedClock } from '../../../shared/domain/clock';
import { FieldRuleViolation } from '../../../shared/domain/errors';
import { Owner } from '../domain/owner';
import { OwnerNotFound } from '../domain/owner.errors';
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

function memoryRepo(): OwnerRepository & { rows: Owner[] } {
  const rows: Owner[] = [];
  return {
    rows,
    insert: async (o) => {
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
    findByTelephone: async () => [],
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
