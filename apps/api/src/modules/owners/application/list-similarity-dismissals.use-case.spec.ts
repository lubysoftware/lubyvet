import { OwnerNotFound } from '../domain/owner.errors';
import { ListSimilarityDismissals } from './list-similarity-dismissals.use-case';
import type { SimilarityDismissal } from './ports/owner-repository.port';

const row: SimilarityDismissal = {
  similarOwner: { id: 9, firstName: 'Marcos', lastName: 'Lima' },
  dismissedBy: { id: 1, name: 'Ana Admin' },
  dismissedAt: new Date('2026-10-07T15:00:00Z'),
};

describe('ListSimilarityDismissals (012/US-3, D51)', () => {
  it('devolve as dispensas do dono na ordem do leitor', async () => {
    const list = await new ListSimilarityDismissals({ dismissalsOf: async () => [row] }).execute(7);
    expect(list).toEqual([row]);
  });

  it('dono inexistente é não encontrado', async () => {
    await expect(
      new ListSimilarityDismissals({ dismissalsOf: async () => null }).execute(99),
    ).rejects.toBeInstanceOf(OwnerNotFound);
  });
});
