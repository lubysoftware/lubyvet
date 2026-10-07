import { FixedClock } from '../../../shared/domain/clock';
import { FieldRuleViolation } from '../../../shared/domain/errors';
import { Pet } from '../domain/pet';
import { PetNameTaken, PetNotFound, UnknownSpecies } from '../domain/pet.errors';
import { ChangePet } from './change-pet.use-case';
import { GetPet } from './get-pet.use-case';
import type { PetRepository, SpeciesCatalog } from './ports/pet-repository.port';

const clock = FixedClock.at('2026-10-07T12:00:00-03:00');
const thor = () =>
  Pet.restore({
    ...Pet.register(7, { name: 'Thor', birthDate: '2020-05-01', speciesId: 2 }, clock.now()).snapshot(),
    id: 3,
    version: 0,
  });
const repo = (calls: number[][] = [], taken = false): PetRepository => ({
  insert: async (p) => p,
  findOfOwner: async (ownerId, petId) => (
    calls.push([ownerId, petId]),
    ownerId === 7 && petId === 3 ? thor() : null
  ),
  update: async (p) => p,
  nameTaken: async () => taken,
});
const species: SpeciesCatalog = {
  findById: async (id) => (id === 2 || id === 1 ? { id, name: 'x' } : null),
  list: async () => [],
  findByName: async () => null,
};

describe('GetPet (T014, P1)', () => {
  it('resolve o animal sempre pelo dono informado', async () => {
    const calls: number[][] = [];
    await new GetPet(repo(calls)).execute(7, 3);
    expect(calls).toEqual([[7, 3]]);
  });

  it('UT-017-6: par dono e animal que não combina é "não encontrado"', async () => {
    await expect(new GetPet(repo()).execute(8, 3)).rejects.toBeInstanceOf(PetNotFound);
  });
});

describe('ChangePet (T015)', () => {
  const run = (patch: object, over: Partial<{ bodyId: number; taken: boolean }> = {}) =>
    new ChangePet(new GetPet(repo([], over.taken)), repo([], over.taken), species, clock).execute({
      ownerId: 7,
      petId: 3,
      bodyId: over.bodyId,
      version: 0,
      patch,
    });

  it('mantém o identificador e aplica a alteração', async () => {
    expect((await run({ name: 'Rex', speciesId: 1 })).snapshot()).toMatchObject({
      id: 3,
      name: 'Rex',
      speciesId: 1,
    });
  });
  it('recusa espécie fora do vocabulário, nome já usado e corpo de outro animal', async () => {
    await expect(run({ speciesId: 99 })).rejects.toBeInstanceOf(UnknownSpecies);
    await expect(run({ name: 'Mel' }, { taken: true })).rejects.toBeInstanceOf(PetNameTaken);
    await expect(run({}, { bodyId: 4 })).rejects.toBeInstanceOf(FieldRuleViolation);
  });
});
