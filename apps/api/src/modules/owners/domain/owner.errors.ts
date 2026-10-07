import { DomainError, NotFound } from '../../../shared/domain/errors';

export class OwnerNotFound extends NotFound {
  constructor() {
    super('owner_not_found');
  }
}

/** D14: o celular já pertence a outro dono; o usuário decide se grava mesmo assim. */
export class SimilarOwnerFound extends DomainError {
  readonly code = 'similar_owner';
  readonly kind = 'conflict';
  constructor(readonly candidates: { id: number; firstName: string; lastName: string; city: string }[]) {
    super('similar_owner');
  }
}
