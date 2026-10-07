import { NotFound } from '../../../shared/domain/errors';
import { ListVetPatients } from './list-vet-patients.use-case';

describe('ListVetPatients (011/T004)', () => {
  it('devolve os animais atendidos pelo veterinário', async () => {
    const rows = [{ petId: 1, petName: 'Bidu', ownerId: 2, encounters: 3 }];
    await expect(new ListVetPatients({ list: async () => rows }).execute(9)).resolves.toEqual(rows);
  });

  it('veterinário inexistente é não encontrado, nunca lista vazia', async () => {
    const run = new ListVetPatients({ list: async () => null }).execute(9);
    await expect(run).rejects.toBeInstanceOf(NotFound);
    await expect(run).rejects.toMatchObject({ code: 'vet_not_found' });
  });
});
