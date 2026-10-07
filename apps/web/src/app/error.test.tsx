import { screen } from '@testing-library/react';
import { renderWithIntl } from '@/test/render';
import ErrorPage from './error';

describe('página de falha (008/US-2, US-6)', () => {
  it('008/CA-6.3 008/CA-2.1 a falha mostra mensagem compreensível e o código, verificada aqui e não por rota exposta', () => {
    const error = Object.assign(new Error('segredo interno em /src/x.ts'), { digest: 'abc123' });
    renderWithIntl(<ErrorPage error={error} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Algo falhou do nosso lado');
    expect(screen.getByRole('alert')).toHaveTextContent('abc123');
    expect(document.body).not.toHaveTextContent(/segredo|\/src\//);
    expect(screen.getByLabelText('Idioma')).toBeInTheDocument();
  });
});
