import { ERROR_CODES, ErrorEnvelope, FIELD_ERROR_CODES } from './errors';

describe('catálogo de erros', () => {
  it('não repete códigos', () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
    expect(new Set(FIELD_ERROR_CODES).size).toBe(FIELD_ERROR_CODES.length);
  });

  it('aceita o envelope de 422 com erros por campo', () => {
    const body = { error: { code: 'validation_failed', fields: [{ path: 'cpf', code: 'cpf_taken' }] } };
    expect(ErrorEnvelope.parse(body)).toEqual(body);
  });

  it('recusa código fora do catálogo', () => {
    expect(() => ErrorEnvelope.parse({ error: { code: 'oops' } })).toThrow();
  });
});
