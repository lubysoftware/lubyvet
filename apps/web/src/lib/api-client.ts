import { ErrorEnvelope } from '@lubyvet/contracts';

export type ApiError = ErrorEnvelope['error'];
export type ApiResult<T> =
  { ok: true; status: number; body: T } | { ok: false; status: number; error: ApiError };

/** D16, P-25: uma chave por formulário; a repetição do mesmo envio recebe a primeira resposta. */
export const newIdempotencyKey = (): string => crypto.randomUUID();

const parse = (text: string): unknown => {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Gravação feita pelo navegador: fala só com o Next, que reescreve /api para a API (D31).
 * A resposta de erro é lida pelo envelope do contrato; o que não for envelope vira internal_error.
 */
export async function apiSend<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;
  const res = await fetch(path, {
    method,
    headers,
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = parse(await res.text());
  if (res.ok) return { ok: true, status: res.status, body: json as T };
  const parsed = ErrorEnvelope.safeParse(json);
  return {
    ok: false,
    status: res.status,
    error: parsed.success ? parsed.data.error : { code: 'internal_error' },
  };
}
