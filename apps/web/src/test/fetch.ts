/** Resposta falsa da API para os testes de componente: um corpo JSON e o status. */
export function mockFetch(...responses: { status: number; body?: unknown }[]) {
  const fn = vi.fn();
  for (const r of responses)
    fn.mockResolvedValueOnce(
      new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status }),
    );
  vi.stubGlobal('fetch', fn);
  return fn;
}

export const sentBody = (fn: ReturnType<typeof vi.fn>, call = 0): unknown =>
  JSON.parse(String((fn.mock.calls[call]?.[1] as RequestInit | undefined)?.body ?? 'null'));
export const sentHeaders = (fn: ReturnType<typeof vi.fn>, call = 0): Record<string, string> =>
  ((fn.mock.calls[call]?.[1] as RequestInit | undefined)?.headers ?? {}) as Record<string, string>;
