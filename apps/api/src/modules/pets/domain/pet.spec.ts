import { FieldRuleViolation, StaleVersion } from '../../../shared/domain/errors';
import { Pet } from './pet';

const NOW = new Date('2026-10-07T12:00:00-03:00');
const fieldsOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof FieldRuleViolation) return e.fields;
    throw e;
  }
  return [];
};

describe('Pet', () => {
  const ok = { name: 'Thor', birthDate: '2020-05-01', speciesId: 2 };

  it('nasce novo, dentro do dono (P1, P4)', () => {
    const pet = Pet.register(7, ok, NOW);
    expect(pet.isNew()).toBe(true);
    expect(pet.ownerId).toBe(7);
    expect([pet.name, pet.speciesId, pet.id]).toEqual(['Thor', 2, undefined]);
  });

  it.each([
    [{ name: ' ' }, [{ path: 'name', code: 'required' }]],
    [{ name: 'a'.repeat(31) }, [{ path: 'name', code: 'too_long' }]],
    [{ birthDate: '' }, [{ path: 'birthDate', code: 'required' }]],
    [{ birthDate: '2026-10-08' }, [{ path: 'birthDate', code: 'date_in_future' }]],
    [{ birthDate: '2026-02-30' }, [{ path: 'birthDate', code: 'invalid_format' }]],
    [{ speciesId: null }, [{ path: 'speciesId', code: 'species_required' }]],
  ])('recusa %j apontando o campo', (over, expected) => {
    expect(fieldsOf(() => Pet.register(7, { ...ok, ...over }, NOW))).toEqual(expected);
  });

  it('aceita nome de 30 caracteres e a data de hoje', () => {
    expect(
      fieldsOf(() => Pet.register(7, { ...ok, name: 'a'.repeat(30), birthDate: '2026-10-07' }, NOW)),
    ).toEqual([]);
  });

  it('na alteração vale a mesma regra, inclusive espécie obrigatória (Pergunta 5)', () => {
    const pet = Pet.restore({ ...Pet.register(7, ok, NOW).snapshot(), id: 3, version: 1 });
    expect(fieldsOf(() => pet.change({ speciesId: null }, 1, NOW))).toEqual([
      { path: 'speciesId', code: 'species_required' },
    ]);
    expect(() => pet.change({ name: 'Rex' }, 0, NOW)).toThrow(StaleVersion);
    pet.change({ name: ' Rex ', birthDate: '2019-01-01', speciesId: 1 }, 1, NOW);
    expect(pet.snapshot()).toMatchObject({ name: 'Rex', birthDate: '2019-01-01', speciesId: 1, id: 3 });
    pet.change({}, 1, NOW);
    expect(pet.isNew()).toBe(false);
  });
});
