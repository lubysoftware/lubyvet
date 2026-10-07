import { FieldRuleViolation, NotFound } from '../../../shared/domain/errors';

export class PetNotFound extends NotFound {
  constructor() {
    super('pet_not_found');
  }
}

/** CA-2.3: nome já usado por outro animal do mesmo dono, no campo nome. */
export class PetNameTaken extends FieldRuleViolation {
  constructor() {
    super([{ path: 'name', code: 'pet_name_taken' }]);
  }
}

export class UnknownSpecies extends FieldRuleViolation {
  constructor() {
    super([{ path: 'speciesId', code: 'unknown_species' }]);
  }
}
