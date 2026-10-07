import { screen } from '@testing-library/react';
import { renderWithIntl } from '@/test/render';
import { StatusBadge } from '@/components/ui/status-badge';
import { navItems } from './app-shell';
import { NavLinks } from './nav-links';

vi.mock('next/navigation', () => ({ usePathname: () => '/owners/12' }));

describe('menu da casca (D18)', () => {
  it('só o Administrador vê a administração', () => {
    expect(navItems('admin').map((i) => i.key)).toEqual(['owners', 'vets', 'admin']);
    expect(navItems('writer').map((i) => i.key)).toEqual(['owners', 'vets']);
    expect(navItems('reader').map((i) => i.key)).toEqual(['owners', 'vets']);
  });

  it('o item da rota atual (e das telas abaixo dela) fica marcado como página atual', () => {
    renderWithIntl(<NavLinks items={navItems('admin')} label="Menu" />);
    expect(screen.getByRole('link', { name: 'Donos' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Veterinários' })).not.toHaveAttribute('aria-current');
  });
});

describe('selo de situação', () => {
  it('escreve a situação; pendente de registro substitui Agendada (D11)', () => {
    renderWithIntl(
      <>
        <StatusBadge status="no_show" pendingRecord={false} />
        <StatusBadge status="scheduled" pendingRecord />
      </>,
    );
    expect(screen.getByText('Não compareceu')).toBeInTheDocument();
    expect(screen.getByText('Pendente de registro')).toBeInTheDocument();
    expect(screen.queryByText('Agendada')).toBeNull();
  });
});
