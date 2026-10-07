import { screen } from '@testing-library/react';
import { renderWithIntl } from '@/test/render';
import { formatCpf, formatPhone, fromLocalInput, toLocalInput } from '@/lib/format';
import { OwnerContact, PetList } from './owner-record-view';

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

describe('máscaras de exibição', () => {
  it('celular, CPF e data e hora local', () => {
    expect(formatPhone('+5511987654321')).toBe('(11) 98765-4321');
    expect(formatPhone('123')).toBe('123');
    expect(formatCpf('12345678909')).toBe('123.456.789-09');
    expect(fromLocalInput(toLocalInput('2026-10-10T15:30:00.000Z'))).toBe('2026-10-10T15:30:00.000Z');
    expect(fromLocalInput('')).toBe('');
  });
});
