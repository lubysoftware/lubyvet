import type { ErrorCode, FieldErrorCode } from '@lubyvet/contracts';

/** Erro de domínio tipado; o status HTTP sai do filtro único (docs/padroes/arquitetura.md). */
export abstract class DomainError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly kind: 'not_found' | 'rule' | 'conflict' | 'unauthenticated' | 'forbidden';
}

export class NotFound extends DomainError {
  readonly kind = 'not_found';
  constructor(readonly code: ErrorCode) {
    super(code);
  }
}

export interface FieldViolation {
  path: string;
  code: FieldErrorCode;
}

/** Regra violada em um ou mais campos: vira 422 com `fields`. */
export class FieldRuleViolation extends DomainError {
  readonly code = 'validation_failed';
  readonly kind = 'rule';
  constructor(readonly fields: FieldViolation[]) {
    super(fields.map((f) => `${f.path}:${f.code}`).join(','));
  }
}

export class InvalidTransition extends DomainError {
  readonly code = 'invalid_transition';
  readonly kind = 'rule';
}

/** US-5 da 001: a gravação chegou com versão vencida. */
export class StaleVersion extends DomainError {
  readonly code = 'stale_version';
  readonly kind = 'conflict';
  constructor(readonly current: unknown) {
    super('stale_version');
  }
}

export class Unauthenticated extends DomainError {
  readonly code = 'unauthenticated';
  readonly kind = 'unauthenticated';
}

export class Forbidden extends DomainError {
  readonly code = 'forbidden';
  readonly kind = 'forbidden';
}
