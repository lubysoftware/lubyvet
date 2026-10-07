import type { SessionOutput } from '@lubyvet/contracts';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';

const apiUrl = (): string => process.env.API_URL ?? 'http://localhost:3001';

/** D31: o servidor do Next chama a API interna repassando o cookie de sessão. */
export async function apiGet<T>(path: string): Promise<{ status: number; body: T }> {
  const cookie = (await cookies()).toString();
  const res = await fetch(`${apiUrl()}${path}`, {
    headers: { cookie, accept: 'application/json' },
    cache: 'no-store',
  });
  return { status: res.status, body: (await res.json()) as T };
}

/**
 * Leitura de tela: sem sessão volta ao login, recurso inexistente vira a página 404 do Next e
 * qualquer outra recusa sobe como erro da rota. Só devolve o corpo de uma resposta 2xx.
 */
export async function load<T>(path: string): Promise<T> {
  const { status, body } = await apiGet<T>(path);
  if (status === 401) redirect('/login');
  if (status === 404) notFound();
  if (status >= 400) throw new Error(`GET ${path} respondeu ${status}`);
  return body;
}

/** Sessão atual, lida uma vez por requisição (D18: o papel decide o que a tela oferece). */
export const currentSession = cache(async (): Promise<SessionOutput> => load<SessionOutput>('/api/session'));
