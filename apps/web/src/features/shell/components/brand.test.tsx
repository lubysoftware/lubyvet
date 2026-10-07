import { render, screen } from '@testing-library/react';
import { Brand } from './brand';
import { SpeciesIcon } from './species-icon';

describe('fundação visual (010/T012)', () => {
  it('sem logo configurado, mostra o logotipo provisório e o nome da clínica (D40, D41)', () => {
    render(<Brand clinicName="Clínica Bichos & Cia" logoUrl={undefined} />);
    expect(screen.getByText('Vet')).toHaveClass('text-primary');
    expect(screen.getByText('Clínica Bichos & Cia')).toBeInTheDocument();
  });

  it('com logo configurado, usa a imagem com o nome como texto alternativo', () => {
    render(<Brand clinicName="Bichos" logoUrl="/logo.svg" />);
    expect(screen.getByRole('img', { name: 'Bichos' })).toHaveAttribute('src', '/logo.svg');
  });

  it('ícones de espécie têm rótulo acessível, e espécie sem ícone usa a pata', () => {
    render(
      <>
        <SpeciesIcon species="Cão" />
        <SpeciesIcon species="Lagarto" />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Cão' })).toHaveClass('lucide-dog');
    expect(screen.getByRole('img', { name: 'Lagarto' })).toHaveClass('lucide-paw-print');
  });
});
