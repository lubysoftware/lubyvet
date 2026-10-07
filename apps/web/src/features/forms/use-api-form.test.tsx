import { RegisterPetInput } from '@lubyvet/contracts';
import { act, renderHook } from '@testing-library/react';
import { apiSend } from '@/lib/api-client';
import { mockFetch, sentHeaders } from '@/test/fetch';
import { useApiForm } from './use-api-form';

afterEach(() => vi.unstubAllGlobals());

const send = (input: unknown, key: string) => apiSend('POST', '/api/owners/1/pets', input, key);
const valid = { name: 'Rex', birthDate: '2020-01-02', speciesId: 2 };

describe('envio de formulário (docs/padroes/frontend.md)', () => {
  it('valida com o schema do contrato antes de chamar a API e marca o campo pelo código', async () => {
    const fetch = mockFetch();
    const { result } = renderHook(() => useApiForm(RegisterPetInput, send, vi.fn()));
    await act(() => result.current.submit({ name: '', birthDate: '2020-01-02' }));
    expect(result.current.errors).toEqual({ name: 'required', speciesId: 'species_required' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('o 422 da API vira erro no campo e a mesma chave é reenviada na nova tentativa (D16)', async () => {
    const fetch = mockFetch(
      {
        status: 422,
        body: { error: { code: 'validation_failed', fields: [{ path: 'name', code: 'pet_name_taken' }] } },
      },
      { status: 201, body: { id: 9 } },
    );
    const done = vi.fn();
    const { result } = renderHook(() => useApiForm(RegisterPetInput, send, done));
    await act(() => result.current.submit(valid));
    expect(result.current.errors).toEqual({ name: 'pet_name_taken' });
    expect(result.current.failure?.code).toBe('validation_failed');
    await act(() => result.current.submit(valid));
    expect(sentHeaders(fetch, 1)['idempotency-key']).toBe(sentHeaders(fetch, 0)['idempotency-key']);
    expect(done).toHaveBeenCalledWith({ id: 9 });
    expect(result.current.errors).toEqual({});
  });

  it('depois de gravar, o próximo envio usa chave nova', async () => {
    const fetch = mockFetch({ status: 201, body: {} }, { status: 201, body: {} });
    const { result } = renderHook(() => useApiForm(RegisterPetInput, send, vi.fn()));
    await act(() => result.current.submit(valid));
    await act(() => result.current.submit(valid));
    expect(sentHeaders(fetch, 1)['idempotency-key']).not.toBe(sentHeaders(fetch, 0)['idempotency-key']);
  });

  it('resposta que não é envelope vira internal_error, sem quebrar a tela', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 502 })));
    const { result } = renderHook(() => useApiForm(RegisterPetInput, send, vi.fn()));
    await act(() => result.current.submit(valid));
    expect(result.current.failure).toEqual({ code: 'internal_error' });
    expect(result.current.pending).toBe(false);
  });
});
