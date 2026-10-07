import type { OwnerOutput } from '@lubyvet/contracts';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/render';
import { mockFetch, sentBody } from '@/test/fetch';
import { OwnerEditor, ownerInput } from './owner-editor';

const assign = vi.fn();
beforeEach(() => {
  assign.mockReset();
  Object.defineProperty(window, 'location', {
    value: { href: 'http://localhost/', assign, reload: vi.fn() },
    writable: true,
  });
});
afterEach(() => vi.unstubAllGlobals());

const owner: OwnerOutput = {
  id: 7,
  firstName: 'Mariana',
  lastName: 'Teixeira',
  address: 'Rua A, 1',
  city: 'Campinas',
  telephone: '+5519987654321',
  cpf: '52998224725',
  email: null,
  messagingConsentAt: null,
  version: 3,
  createdAt: '',
  updatedAt: '',
};

async function fillNew() {
  const type = (label: string, v: string) => userEvent.type(screen.getByLabelText(label), v);
  await type('Nome', 'Mariana');
  await type('Sobrenome', 'Teixeira');
  await type('Endereço', 'Rua A, 1');
  await type('Cidade', 'Campinas');
  await type('Celular', '(19) 98765-4321');
  await type('CPF', '529.982.247-25');
}

describe('cadastro e alteração do dono (001/US-1, US-4)', () => {
  it('texto do formulário vira a entrada do contrato', () => {
    const raw = {
      firstName: 'A',
      lastName: 'B',
      address: 'C',
      city: 'D',
      telephone: 'E',
      cpf: 'F',
      email: '',
    };
    expect(ownerInput(raw, 'create')).toMatchObject({ cpf: 'F', email: undefined, messagingConsent: false });
    expect(ownerInput({ ...raw, messagingConsent: 'on' }, 'edit', 2)).toMatchObject({
      version: 2,
      email: '',
      messagingConsent: true,
    });
    expect(ownerInput(raw, 'edit', 2)).not.toHaveProperty('cpf');
  });

  it('cadastra e abre a ficha com a mensagem de resultado', async () => {
    const fetch = mockFetch({ status: 201, body: { ...owner, id: 12 } });
    renderWithIntl(<OwnerEditor />);
    await fillNew();
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar dono' }));
    expect(sentBody(fetch)).toMatchObject({ cpf: '529.982.247-25', confirmSimilar: false });
    expect(assign).toHaveBeenCalledWith('/owners/12?saved=ownerSaved');
  });

  it('D14: celular de outro dono mostra o parecido e grava só com a confirmação', async () => {
    const fetch = mockFetch(
      {
        status: 409,
        body: {
          error: {
            code: 'similar_owner',
            current: [{ id: 3, firstName: 'Mari', lastName: 'T', city: 'Campinas' }],
          },
        },
      },
      { status: 201, body: { ...owner, id: 13 } },
    );
    renderWithIntl(<OwnerEditor />);
    await fillNew();
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar dono' }));
    expect(await screen.findByRole('link', { name: 'Mari T' })).toHaveAttribute('href', '/owners/3');
    await userEvent.click(screen.getByRole('button', { name: 'Gravar mesmo assim' }));
    expect(sentBody(fetch, 1)).toMatchObject({ confirmSimilar: true, firstName: 'Mariana' });
    expect(assign).toHaveBeenCalledWith('/owners/13?saved=ownerSaved');
  });

  it('a alteração manda a versão, não oferece o CPF e trata a versão vencida (US-5)', async () => {
    const fetch = mockFetch({ status: 409, body: { error: { code: 'stale_version', current: {} } } });
    renderWithIntl(<OwnerEditor owner={owner} />);
    expect(screen.queryByLabelText('CPF')).toBeNull();
    expect(screen.getByLabelText('Cidade')).toHaveValue('Campinas');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar dono' }));
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/owners/7');
    expect(sentBody(fetch)).toMatchObject({ version: 3, email: '' });
    expect(await screen.findByRole('alert')).toHaveTextContent('alterado por outra pessoa');
    await userEvent.click(screen.getByRole('button', { name: 'Ver os valores atuais' }));
    expect(window.location.reload).toHaveBeenCalled();
  });
});
