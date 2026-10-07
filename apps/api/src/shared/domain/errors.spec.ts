import {
  FieldRuleViolation,
  Forbidden,
  IdempotencyKeyRequired,
  InvalidTransition,
  NotFound,
  RequestInProgress,
  StaleVersion,
  Unauthenticated,
} from './errors';

describe('erros de domínio', () => {
  it('carregam o código do catálogo e o tipo que decide o status HTTP', () => {
    expect(new NotFound('owner_not_found')).toMatchObject({ code: 'owner_not_found', kind: 'not_found' });
    expect(new InvalidTransition()).toMatchObject({ code: 'invalid_transition', kind: 'rule' });
    expect(new StaleVersion({ version: 2 })).toMatchObject({
      code: 'stale_version',
      kind: 'conflict',
      current: { version: 2 },
    });
    expect(new Unauthenticated()).toMatchObject({ kind: 'unauthenticated' });
    expect(new Forbidden()).toMatchObject({ kind: 'forbidden' });
  });

  it('agrupa violações de campo num erro 422', () => {
    const e = new FieldRuleViolation([{ path: 'cpf', code: 'cpf_taken' }]);
    expect(e).toMatchObject({
      code: 'validation_failed',
      kind: 'rule',
      fields: [{ path: 'cpf', code: 'cpf_taken' }],
    });
    expect(e.message).toBe('cpf:cpf_taken');
  });

  it('idempotência: chave ausente é regra (422), chave em processamento é conflito (409)', () => {
    expect(new IdempotencyKeyRequired('x')).toMatchObject({ code: 'idempotency_key_required', kind: 'rule' });
    expect(new RequestInProgress('x')).toMatchObject({ code: 'request_in_progress', kind: 'conflict' });
  });
});
