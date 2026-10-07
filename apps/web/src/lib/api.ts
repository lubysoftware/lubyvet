import { cookies } from 'next/headers';

/** D31: o servidor do Next chama a API interna repassando o cookie de sessão. */
export async function apiGet<T>(path: string): Promise<{ status: number; body: T }> {
  const cookie = (await cookies()).toString();
  const res = await fetch(`${process.env.API_URL ?? 'http://localhost:3001'}${path}`, {
    headers: { cookie, accept: 'application/json' },
    cache: 'no-store',
  });
  return { status: res.status, body: (await res.json()) as T };
}
