import { screen } from '@testing-library/react';
import { renderWithIntl } from '@/test/render';
import { VetCatalog, VetPatients } from './vets-view';

const vet = (id: number, specialties: { id: number; name: string }[]) => ({
  id,
  firstName: 'Helena',
  lastName: `Costa ${id}`,
  specialties,
});

describe('quadro de veterinários (005)', () => {
  it('lista com especialidades, diz quando não há nenhuma e pagina pela URL', () => {
    renderWithIntl(
      <VetCatalog
        data={{
          items: [
            vet(1, [
              { id: 1, name: 'Cirurgia' },
              { id: 2, name: 'Radiologia' },
            ]),
            vet(2, []),
          ],
          page: 2,
          pageSize: 10,
          total: 25,
        }}
      />,
    );
    expect(screen.getByRole('row', { name: /Costa 1/ })).toHaveTextContent('Cirurgia, Radiologia');
    expect(screen.getByRole('row', { name: /Costa 2/ })).toHaveTextContent('Sem especialidade');
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Anterior' })).toHaveAttribute('href', '/vets?page=1');
    expect(screen.getByRole('link', { name: 'Próxima' })).toHaveAttribute('href', '/vets?page=3');
  });

  it('os animais atendidos abrem pela ficha do dono (P1)', () => {
    renderWithIntl(<VetPatients patients={[{ petId: 4, petName: 'Bidu', ownerId: 7, encounters: 2 }]} />);
    expect(screen.getByRole('link', { name: 'Bidu' })).toHaveAttribute('href', '/owners/7?pet=4');
    expect(screen.getByText('2 atendimentos')).toBeInTheDocument();
    renderWithIntl(<VetPatients patients={[]} />);
    expect(screen.getByText('Nenhum atendimento registrado por este veterinário.')).toBeInTheDocument();
  });
});
