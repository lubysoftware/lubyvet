import { FixedClock } from '../../../shared/domain/clock';
import { NotFound } from '../../../shared/domain/errors';
import type { OwnerRepository } from '../../owners/application/ports/owner-repository.port';
import { Pet } from '../domain/pet';
import { PetNameTaken, UnknownSpecies } from '../domain/pet.errors';
import { ListSpecies } from './list-species.use-case';
import type { PetRepository, SpeciesCatalog } from './ports/pet-repository.port';
import { RegisterPet } from './register-pet.use-case';

const clock = FixedClock.at('2026-10-07T12:00:00-03:00');
const owners = (exists: boolean) =>
  ({ findById: async () => (exists ? ({} as never) : null) }) as unknown as OwnerRepository;
const species: SpeciesCatalog = {
  findById: async (id) => (id === 2 ? { id: 2, name: 'Cão' } : null),
  list: async () => [{ id: 2, name: 'Cão' }],
  findByName: async () => null,
};
const pets = (taken: boolean): PetRepository & { inserted: Pet[] } => {
  const inserted: Pet[] = [];
  return {
    inserted,
    insert: async (p) => (inserted.push(p), Pet.restore({ ...p.snapshot(), id: 1 })),
    findOfOwner: async () => null,
    update: async (p) => p,
    nameTaken: async () => taken,
  };
};
const fields = { name: 'Thor', birthDate: '2020-05-01', speciesId: 2 };

describe('RegisterPet', () => {
  it('grava o animal com um dono e uma espécie', async () => {
    const repo = pets(false);
    const pet = await new RegisterPet(owners(true), repo, species, clock).execute(7, fields);
    expect(pet.snapshot()).toMatchObject({ id: 1, ownerId: 7, speciesId: 2 });
  });

  it('dono inexistente responde "não encontrado"', async () => {
    await expect(
      new RegisterPet(owners(false), pets(false), species, clock).execute(7, fields),
    ).rejects.toBeInstanceOf(NotFound);
  });

  it('espécie fora do vocabulário é erro no campo espécie', async () => {
    await expect(
      new RegisterPet(owners(true), pets(false), species, clock).execute(7, { ...fields, speciesId: 99 }),
    ).rejects.toBeInstanceOf(UnknownSpecies);
  });

  it('T008: nome já usado entre os animais do dono é recusado antes de gravar', async () => {
    const repo = pets(true);
    await expect(
      new RegisterPet(owners(true), repo, species, clock).execute(7, fields),
    ).rejects.toBeInstanceOf(PetNameTaken);
    expect(repo.inserted).toHaveLength(0);
  });

  it('lista o vocabulário de espécies', async () => {
    await expect(new ListSpecies(species).execute()).resolves.toEqual([{ id: 2, name: 'Cão' }]);
  });
});
