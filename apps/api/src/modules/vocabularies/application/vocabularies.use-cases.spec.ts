import { FieldRuleViolation, NotFound, StaleVersion } from '../../../shared/domain/errors';
import type { VetCatalogCache } from '../../vets/application/ports/vet-catalog.port';
import type { VocabularyRepository } from './ports/vocabulary.port';
import { Vocabularies } from './vocabularies.use-cases';

const sp = { id: 1, name: 'Gato', status: 'active', version: 0, petsCount: 0 };
const vet = {
  id: 1,
  firstName: 'Paula',
  lastName: 'Rezende',
  status: 'active',
  version: 0,
  specialtyIds: [],
};
const repo = (found: boolean, updated: boolean): VocabularyRepository => ({
  listSpecies: async () => [sp],
  listSpecialties: async () => [{ id: 1, name: 'Cirurgia' }],
  createSpecies: async (name) => ({ ...sp, name }),
  updateSpecies: async () => (updated ? sp : null),
  findSpecies: async () => (found ? sp : null),
  listVets: async () => [vet],
  createVet: async () => vet,
  updateVet: async () => (updated ? vet : null),
  findVet: async () => (found ? vet : null),
});

describe('Vocabularies', () => {
  let invalidations = 0;
  const cache: VetCatalogCache = {
    get: async () => null,
    set: async () => undefined,
    invalidate: async () => void invalidations++,
  };

  it('mantém espécies: lista, inclui, altera; inexistente é 404 e versão vencida é 409', async () => {
    const v = new Vocabularies(repo(true, true), cache);
    expect(await v.listSpecies()).toHaveLength(1);
    expect((await v.createSpecies(' Coelho ')).name).toBe('Coelho');
    await expect(v.changeSpecies(1, 0, { name: 'Felino' })).resolves.toBeTruthy();
    await expect(new Vocabularies(repo(false, true), cache).changeSpecies(1, 0, {})).rejects.toBeInstanceOf(
      NotFound,
    );
    await expect(new Vocabularies(repo(true, false), cache).changeSpecies(1, 0, {})).rejects.toBeInstanceOf(
      StaleVersion,
    );
  });

  it('mantém o quadro e invalida o catálogo a cada escrita', async () => {
    invalidations = 0;
    const v = new Vocabularies(repo(true, true), cache);
    expect(await v.listVets()).toHaveLength(1);
    await v.createVet('Paula', 'Rezende', [1]);
    await v.changeVet(1, 0, { firstName: 'Ana', status: 'dismissed' });
    expect(invalidations).toBe(2);
    await expect(v.createVet('Paula', 'Rezende', [1, 1])).rejects.toBeInstanceOf(FieldRuleViolation);
    await expect(new Vocabularies(repo(false, true), cache).changeVet(1, 0, {})).rejects.toBeInstanceOf(
      NotFound,
    );
    await expect(new Vocabularies(repo(true, false), cache).changeVet(1, 0, {})).rejects.toBeInstanceOf(
      StaleVersion,
    );
  });
});
