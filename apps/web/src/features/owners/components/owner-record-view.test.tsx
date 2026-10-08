import { screen, within } from '@testing-library/react';
import { renderWithIntl } from '@/test/render';
import { formatCpf, formatPhone, fromLocalInput, toLocalInput } from '@/lib/format';
import { OwnerContact, PetList, SimilarityDismissals } from './owner-record-view';

const owner = {
  id: 7,
  firstName: 'Mariana',
  lastName: 'Teixeira',
  address: 'Rua A, 1',
  city: 'Campinas',
  telephone: '+5519987654321',
  cpf: '52998224725',
  email: null,
  messagingConsentAt: '2026-01-01T00:00:00Z',
  version: 3,
  createdAt: '',
  updatedAt: '',
};
const pet = (id: number, name: string, status = 'active') => ({
  id,
  name,
  birthDate: '2020-03-04',
  species: { id: 2, name: 'Cão' },
  status,
  visits: { items: [], page: 1, pageSize: 10, total: 0 },
});

describe('ficha do dono (001/US-6, 007/US-4)', () => {
  it('mostra o contato com máscaras e a autoria', () => {
    renderWithIntl(
      <OwnerContact
        owner={owner}
        authorship={{
          createdBy: { id: 2, name: 'Carla Escrita' },
          createdAt: '2026-10-01T13:00:00Z',
          updatedBy: null,
          updatedAt: '2026-10-02T13:00:00Z',
        }}
      />,
    );
    expect(screen.getByText('(19) 98765-4321')).toBeInTheDocument();
    expect(screen.getByText('529.982.247-25')).toBeInTheDocument();
    expect(screen.getByText('Não informado')).toBeInTheDocument();
    expect(screen.getByText(/Cadastrado por Carla Escrita em 01\/10\/2026/)).toBeInTheDocument();
  });

  it('lista os animais, marca o escolhido e diz a situação que não é Ativo', () => {
    renderWithIntl(<PetList ownerId={7} pets={[pet(1, 'Bidu'), pet(2, 'Rex', 'deceased')]} selected={2} />);
    expect(screen.getByRole('link', { name: /Rex/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: /Rex/ })).toHaveTextContent('Falecido');
    expect(screen.getByRole('link', { name: /Bidu/ })).toHaveAttribute('href', '/owners/7?pet=1');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('dono sem animal diz isso', () => {
    renderWithIntl(<PetList ownerId={7} pets={[]} selected={null} />);
    expect(screen.getByText('Nenhum animal cadastrado.')).toBeInTheDocument();
  });
});

describe('histórico da dispensa do aviso de dono parecido (012/US-3, D51)', () => {
  const dismissals = [
    {
      similarOwner: { id: 9, firstName: 'Marcos', lastName: 'Lima' },
      dismissedBy: { id: 2, name: 'Carla Escrita' },
      dismissedAt: '2026-10-09T12:00:00Z',
    },
    {
      similarOwner: { id: 4, firstName: 'Ana', lastName: 'Souza' },
      dismissedBy: { id: 1, name: 'Ana Admin' },
      dismissedAt: '2026-10-08T12:00:00Z',
    },
  ];

  it('012/CA-3.3 a ficha mostra a lista ao Administrador, na ordem da API, com o dono parecido, quem e quando', () => {
    renderWithIntl(<SimilarityDismissals role="admin" dismissals={dismissals} />);
    const section = screen.getByRole('region', { name: 'Avisos de dono parecido dispensados' });
    const items = within(section).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'Marcos Lima dispensado por Carla Escrita em 09/10/2026, 09:00',
      'Ana Souza dispensado por Ana Admin em 08/10/2026, 09:00',
    ]);
    expect(within(section).getByRole('link', { name: 'Marcos Lima' })).toHaveAttribute('href', '/owners/9');
  });

  it('012/CA-3.3 Escrita e Leitura não veem a seção', () => {
    for (const role of ['writer', 'reader'] as const) {
      const { container, unmount } = renderWithIntl(
        <SimilarityDismissals role={role} dismissals={dismissals} />,
      );
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it('012/CA-3.3 sem dispensa, o Administrador vê que não houve nenhuma, também em inglês', () => {
    renderWithIntl(<SimilarityDismissals role="admin" dismissals={[]} />, 'en');
    expect(screen.getByRole('heading', { name: 'Dismissed similar-owner warnings' })).toBeInTheDocument();
    expect(screen.getByText('No similar-owner warning was dismissed for this owner.')).toBeInTheDocument();
  });
});

describe('máscaras de exibição', () => {
  it('celular, CPF e data e hora local', () => {
    expect(formatPhone('+5511987654321')).toBe('(11) 98765-4321');
    expect(formatPhone('123')).toBe('123');
    expect(formatCpf('12345678909')).toBe('123.456.789-09');
    expect(fromLocalInput(toLocalInput('2026-10-10T15:30:00.000Z'))).toBe('2026-10-10T15:30:00.000Z');
    expect(fromLocalInput('')).toBe('');
  });
});
