import { OwnerNotFound } from '../domain/owner.errors';
import { GetAuthorship } from './get-authorship.use-case';

describe('GetAuthorship (011/T006)', () => {
  it('devolve a autoria do cadastro e recusa dono inexistente', async () => {
    const a = { createdBy: null, createdAt: 'x', updatedBy: null, updatedAt: 'y' };
    await expect(new GetAuthorship({ authorship: async () => a }).execute(1)).resolves.toBe(a);
    await expect(new GetAuthorship({ authorship: async () => null }).execute(1)).rejects.toBeInstanceOf(
      OwnerNotFound,
    );
  });
});
