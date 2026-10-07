import { type PipeTransform } from '@nestjs/common';
import { FIELD_ERROR_CODES, type FieldErrorCode } from '@lubyvet/contracts';
import type { z } from 'zod';
import { FieldRuleViolation } from '../../domain/errors';

const KNOWN = new Set<string>(FIELD_ERROR_CODES);

function codeOf(issue: z.core.$ZodIssue): FieldErrorCode {
  if (KNOWN.has(issue.message)) return issue.message as FieldErrorCode;
  if (issue.code === 'invalid_type' && issue.input === undefined) return 'required';
  if (issue.code === 'too_big') return 'too_long';
  if (issue.code === 'too_small') return 'too_short';
  return 'invalid_format';
}

/** Valida o corpo com o schema do contrato (D32); erro vira 422 com o campo apontado. */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}
  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value ?? {});
    if (result.success) return result.data;
    throw new FieldRuleViolation(
      result.error.issues.map((i) => ({ path: i.path.join('.') || '_', code: codeOf(i) })),
    );
  }
}
