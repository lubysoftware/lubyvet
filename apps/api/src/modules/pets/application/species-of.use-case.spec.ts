import { SpeciesOf } from './species-of.use-case';

describe('SpeciesOf (011/T006)', () => {
  it('devolve id e nome; espécie que sumiu fica com o id e nome vazio', async () => {
    const catalog = {
      list: jest.fn(),
      findByName: jest.fn(),
      findById: async (id: number) => (id === 2 ? { id: 2, name: 'Cão', status: 'inactive' } : null),
    };
    await expect(new SpeciesOf(catalog).execute(2)).resolves.toEqual({ id: 2, name: 'Cão' });
    await expect(new SpeciesOf(catalog).execute(9)).resolves.toEqual({ id: 9, name: '' });
  });
});
