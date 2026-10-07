'use client';

import { FIELD_ERROR_CODES, type FieldErrorCode } from '@lubyvet/contracts';
import { useRef, useState } from 'react';
import type { z } from 'zod';
import { type ApiError, type ApiResult, newIdempotencyKey } from '@/lib/api-client';
import { type FieldErrors, fieldErrorsFrom } from './field-errors';

const isFieldCode = (m: string): m is FieldErrorCode => (FIELD_ERROR_CODES as readonly string[]).includes(m);

/** O schema do contrato já carrega o código do erro na mensagem ({ error: 'required' }). */
export function fieldErrorsFromIssues(issues: readonly z.core.$ZodIssue[]): FieldErrors {
  const out: FieldErrors = {};
  for (const i of issues) {
    const path = i.path.map(String).join('.');
    if (!(path in out)) out[path] = isFieldCode(i.message) ? i.message : 'invalid_format';
  }
  return out;
}

export interface ApiFormState {
  errors: FieldErrors;
  failure: ApiError | null;
  pending: boolean;
}

/**
 * Envio de formulário (docs/padroes/frontend.md): valida a forma com o schema de entrada do
 * contrato, manda a Idempotency-Key do formulário e trava o botão durante o envio. O 422 da API
 * vira erro no campo; as outras recusas ficam em `failure` para a tela tratar.
 */
export function useApiForm<S extends z.ZodType, T>(
  schema: S,
  send: (input: z.output<S>, idempotencyKey: string) => Promise<ApiResult<T>>,
  onSuccess: (body: T) => void,
) {
  const key = useRef<string | null>(null);
  const [state, setState] = useState<ApiFormState>({ errors: {}, failure: null, pending: false });

  async function submit(raw: unknown): Promise<void> {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      setState({ errors: fieldErrorsFromIssues(parsed.error.issues), failure: null, pending: false });
      return;
    }
    key.current ??= newIdempotencyKey();
    setState((s) => ({ ...s, pending: true }));
    const result = await send(parsed.data, key.current);
    if (result.ok) {
      key.current = null;
      setState({ errors: {}, failure: null, pending: false });
      onSuccess(result.body);
      return;
    }
    setState({ errors: fieldErrorsFrom({ error: result.error }), failure: result.error, pending: false });
  }

  return { ...state, submit };
}
