import { ErrorEnvelope, type FieldErrorCode } from '@lubyvet/contracts';

/** 010/T007: modelo de erro do formulário, um código por campo, vindo do 422 da API (D31, P-24). */
export type FieldErrors = Record<string, FieldErrorCode>;

export function fieldErrorsFrom(body: unknown): FieldErrors {
  const parsed = ErrorEnvelope.safeParse(body);
  if (!parsed.success) return {};
  return Object.fromEntries((parsed.data.error.fields ?? []).map((f) => [f.path, f.code]));
}
