import { FixedClock } from '../../../shared/domain/clock';
import { FieldRuleViolation, StaleVersion } from '../../../shared/domain/errors';
import { Owner } from '../domain/owner';
import { OwnerNotFound, SimilarOwnerFound } from '../domain/owner.errors';
import { ChangeOwnerContact } from './change-owner-contact.use-case';
import type { OwnerRepository } from './ports/owner-repository.port';

const clock = FixedClock.at('2026-10-07T12:00:00-03:00');
const stored = () =>
  Owner.restore({
    ...Owner.register(
      {
        firstName: 'Mariana',
        lastName: 'Teixeira',
        address: 'Rua A, 1',
        city: 'São Paulo',
        telephone: '(11) 98765-4321',
        cpf: '529.982.247-25',
        messagingConsent: false,
      },
      clock.now(),
    ).snapshot(),
    id: 7,
    version: 2,
  });
const repo = (
  owner: Owner | null,
  similar: { id: number; firstName: string; lastName: string; city: string }[] = [],
): OwnerRepository => ({
  insert: async (o) => o,
  findById: async () => owner,
  update: async (o) => o,
  findByTelephone: async () => similar,
});

describe('ChangeOwnerContact', () => {
  it('UT-004-2: grava os dados novos mantendo o identificador', async () => {
    const updated = await new ChangeOwnerContact(repo(stored()), clock).execute({
      ownerId: 7,
      bodyId: 7,
      version: 2,
      patch: { city: 'Campinas' },
    });
    expect(updated.snapshot()).toMatchObject({ id: 7, city: 'Campinas', firstName: 'Mariana' });
  });

  it('REG-05: recusa corpo que nomeia outro dono', async () => {
    await expect(
      new ChangeOwnerContact(repo(stored()), clock).execute({ ownerId: 7, bodyId: 8, version: 2, patch: {} }),
    ).rejects.toEqual(new FieldRuleViolation([{ path: 'id', code: 'id_mismatch' }]));
  });

  it('responde "não encontrado" para dono inexistente', async () => {
    await expect(
      new ChangeOwnerContact(repo(null), clock).execute({
        ownerId: 7,
        bodyId: undefined,
        version: 0,
        patch: {},
      }),
    ).rejects.toBeInstanceOf(OwnerNotFound);
  });

  it('UT-005-1: compara a versão antes de aceitar', async () => {
    await expect(
      new ChangeOwnerContact(repo(stored()), clock).execute({
        ownerId: 7,
        bodyId: undefined,
        version: 1,
        patch: { city: 'X' },
      }),
    ).rejects.toBeInstanceOf(StaleVersion);
  });

  const other = [{ id: 9, firstName: 'Marcos', lastName: 'Lima', city: 'Rio' }];

  it('D14: trocar para o celular de outro dono apresenta o candidato', async () => {
    await expect(
      new ChangeOwnerContact(repo(stored(), other), clock).execute({
        ownerId: 7,
        bodyId: undefined,
        version: 2,
        patch: { telephone: '(21) 99123-0045' },
      }),
    ).rejects.toBeInstanceOf(SimilarOwnerFound);
  });

  it('D14: com a confirmação, grava e registra a dispensa', async () => {
    const updated = await new ChangeOwnerContact(repo(stored(), other), clock).execute({
      ownerId: 7,
      bodyId: undefined,
      version: 2,
      patch: { telephone: '(21) 99123-0045' },
      confirmSimilar: true,
    });
    expect(updated.snapshot().similarityDismissedAt).toEqual(clock.now());
    expect(updated.dismissedSimilarOwnerIds).toEqual(other.map((c) => c.id));
  });

  it('celular novo sem coincidência grava sem aviso', async () => {
    const updated = await new ChangeOwnerContact(repo(stored(), []), clock).execute({
      ownerId: 7,
      bodyId: undefined,
      version: 2,
      patch: { telephone: '(21) 99123-0045' },
    });
    expect(updated.telephone).toBe('+5521991230045');
  });
});
