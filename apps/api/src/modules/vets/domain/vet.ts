import { VET_LIMITS } from '@lubyvet/contracts';
import { FieldRuleViolation, type FieldViolation } from '../../../shared/domain/errors';

/** 005/T002: nome e sobrenome obrigatórios, com os limites do banco (P3). */
export function checkVetNames(firstName: string, lastName: string): { firstName: string; lastName: string } {
  const v: FieldViolation[] = [];
  const out = { firstName: firstName.trim(), lastName: lastName.trim() };
  for (const f of ['firstName', 'lastName'] as const) {
    if (out[f] === '') v.push({ path: f, code: 'required' });
    else if (out[f].length > VET_LIMITS[f]) v.push({ path: f, code: 'too_long' });
  }
  if (v.length) throw new FieldRuleViolation(v);
  return out;
}
