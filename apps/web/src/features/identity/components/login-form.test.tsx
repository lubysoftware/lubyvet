import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/render';
import { mockFetch, sentBody, sentHeaders } from '@/test/fetch';
import { LoginForm } from './login-form';

afterEach(() => vi.unstubAllGlobals());

describe('login (007/US-1)', () => {
  it('campos vazios ficam marcados sem chamar a API', async () => {
    const fetch = mockFetch();
    renderWithIntl(<LoginForm onDone={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByLabelText('Login')).toHaveAccessibleDescription('Preencha este campo.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('credencial recusada mostra uma mensagem só, do catálogo', async () => {
    mockFetch({ status: 401, body: { error: { code: 'invalid_credentials' } } });
    renderWithIntl(<LoginForm onDone={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Login'), 'ana');
    await userEvent.type(screen.getByLabelText('Senha'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Login ou senha não conferem.');
  });

  it('login aceito abre a sessão e segue (a sessão não pede Idempotency-Key)', async () => {
    const fetch = mockFetch({ status: 200, body: { userId: 1, name: 'Ana', role: 'admin' } });
    const done = vi.fn();
    renderWithIntl(<LoginForm onDone={done} />);
    await userEvent.type(screen.getByLabelText('Login'), 'ana');
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(done).toHaveBeenCalled();
    expect(sentBody(fetch)).toEqual({ login: 'ana', password: 'segredo' });
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/session');
    expect(sentHeaders(fetch)['content-type']).toBe('application/json');
  });
});
