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
const surgery = { id: 1, name: 'Cirurgia', status: 'active', version: 0, vetsCount: 2 };
const repo = (found: boolean, updated: boolean, inactive: number[] = []): VocabularyRepository => ({
  listSpecies: async () => [sp],
  listSpecialties: async () => [surgery],
  createSpecialty: async (name) => ({ ...surgery, name, vetsCount: 0 }),
  updateSpecialty: async (_id, _version, data) =>
    updated
      ? { ...surgery, name: data.name ?? surgery.name, status: data.status ?? surgery.status, version: 1 }
      : null,
  findSpecialty: async () => (found ? surgery : null),
  inactiveSpecialtyIds: async (ids) => ids.filter((id) => inactive.includes(id)),
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

  describe('especialidades (012/US-4, D52)', () => {
    it('lista e inclui sem espaços nas pontas; incluir não mexe no catálogo', async () => {
      invalidations = 0;
      const v = new Vocabularies(repo(true, true), cache);
      expect(await v.listSpecialties()).toEqual([surgery]);
      expect((await v.createSpecialty('  Dermatologia ')).name).toBe('Dermatologia');
      expect(invalidations).toBe(0);
    });

    it('renomeia e inativa com a versão lida e invalida o catálogo, que mostra o nome', async () => {
      invalidations = 0;
      const v = new Vocabularies(repo(true, true), cache);
      expect(await v.changeSpecialty(1, 0, { name: ' Cirurgia geral ' })).toMatchObject({
        name: 'Cirurgia geral',
        version: 1,
      });
      expect(await v.changeSpecialty(1, 1, { status: 'inactive' })).toMatchObject({ status: 'inactive' });
      expect(invalidations).toBe(2);
    });

    it('especialidade inexistente é 404 e versão vencida é 409 com os valores atuais', async () => {
      await expect(
        new Vocabularies(repo(false, true), cache).changeSpecialty(9, 0, {}),
      ).rejects.toBeInstanceOf(NotFound);
      const stale = new Vocabularies(repo(true, false), cache).changeSpecialty(1, 0, { name: 'X' });
      await expect(stale).rejects.toBeInstanceOf(StaleVersion);
      await expect(stale).rejects.toMatchObject({ current: surgery });
    });

    it('recusa atribuir especialidade inativa na inclusão e no acréscimo, no campo usado', async () => {
      const v = new Vocabularies(repo(true, true, [2]), cache);
      await expect(v.createVet('Paula', 'Rezende', [1, 2])).rejects.toMatchObject({
        fields: [{ path: 'specialtyIds', code: 'specialty_inactive' }],
      });
      await expect(v.changeVet(1, 0, { addSpecialtyId: 2 })).rejects.toMatchObject({
        fields: [{ path: 'addSpecialtyId', code: 'specialty_inactive' }],
      });
      await expect(v.createVet('Paula', 'Rezende', [])).resolves.toBeTruthy();
      await expect(v.changeVet(1, 0, { addSpecialtyId: 1 })).resolves.toBeTruthy();
    });

    it('retirar a especialidade inativa do veterinário é aceito e invalida o catálogo', async () => {
      invalidations = 0;
      const v = new Vocabularies(repo(true, true, [2]), cache);
      await expect(v.changeVet(1, 0, { removeSpecialtyId: 2 })).resolves.toBeTruthy();
      expect(invalidations).toBe(1);
    });
  });
});
