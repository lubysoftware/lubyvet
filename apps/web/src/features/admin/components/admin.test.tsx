import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/render';
import { mockFetch, sentBody } from '@/test/fetch';
import { Indicators } from './indicators';
import { SpeciesAdmin, VetsAdmin } from './vocabulary-admin';

const reload = vi.fn();
beforeEach(() => {
  reload.mockReset();
  Object.defineProperty(window, 'location', { value: { href: 'http://localhost/', reload }, writable: true });
});
afterEach(() => vi.unstubAllGlobals());

describe('vocabulário de espécies (009/US-1)', () => {
  const rows = [
    { id: 1, name: 'Gato', status: 'active', version: 0, petsCount: 3 },
    { id: 7, name: 'Furão', status: 'inactive', version: 2, petsCount: 1 },
  ];

  it('inclui pelo schema do contrato; nome repetido volta como erro no campo', async () => {
    const fetch = mockFetch({
      status: 422,
      body: { error: { code: 'validation_failed', fields: [{ path: 'name', code: 'species_name_taken' }] } },
    });
    renderWithIntl(<SpeciesAdmin rows={rows} />);
    await userEvent.click(screen.getByRole('button', { name: 'Incluir espécie' }));
    expect(screen.getByLabelText('Espécie')).toHaveAccessibleDescription('Preencha este campo.');
    await userEvent.type(screen.getByLabelText('Espécie'), 'Gato');
    await userEvent.click(screen.getByRole('button', { name: 'Incluir espécie' }));
    expect(sentBody(fetch)).toEqual({ name: 'Gato' });
    expect(screen.getByLabelText('Espécie')).toHaveAccessibleDescription(
      'Já existe uma espécie com esse nome.',
    );
  });

  it('inativa e reativa com a versão lida; cada botão diz de qual espécie é', async () => {
    const fetch = mockFetch({ status: 200, body: {} });
    renderWithIntl(<SpeciesAdmin rows={rows} />);
    expect(screen.getByRole('row', { name: /Furão/ })).toHaveTextContent('Inativa');
    await userEvent.click(screen.getByRole('button', { name: 'Reativar Furão' }));
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/admin/species/7');
    expect(sentBody(fetch)).toEqual({ version: 2, status: 'active' });
    expect(reload).toHaveBeenCalled();
  });

  it('a recusa da mudança aparece sem recarregar', async () => {
    mockFetch({ status: 409, body: { error: { code: 'stale_version' } } });
    renderWithIntl(<SpeciesAdmin rows={rows} />);
    await userEvent.click(screen.getByRole('button', { name: 'Inativar Gato' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('alterado por outra pessoa');
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('quadro de veterinários (009/US-2)', () => {
  const specialties = [
    { id: 1, name: 'Cirurgia' },
    { id: 2, name: 'Odontologia' },
    { id: 3, name: 'Radiologia' },
  ];
  const helena = {
    id: 3,
    firstName: 'Helena',
    lastName: 'Costa',
    status: 'active',
    version: 1,
    specialtyIds: [3],
  };

  it('009/CA-2.1 a tela inclui veterinário com nenhuma, uma ou várias especialidades', async () => {
    const fetch = mockFetch({ status: 201, body: {} }, { status: 201, body: {} });
    renderWithIntl(<VetsAdmin rows={[helena]} specialties={specialties} />);
    expect(screen.getByRole('row', { name: /Helena Costa/ })).toHaveTextContent('Radiologia');
    await userEvent.type(screen.getByLabelText('Nome'), 'Rui');
    await userEvent.type(screen.getByLabelText('Sobrenome'), 'Lima');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Cirurgia' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Odontologia' }));
    await userEvent.click(screen.getByRole('button', { name: 'Incluir veterinário' }));
    expect(sentBody(fetch)).toEqual({ firstName: 'Rui', lastName: 'Lima', specialtyIds: [1, 2] });
  });

  it('009/CA-2.2 a tela acrescenta especialidade a um veterinário cadastrado, com a versão lida, e desliga', async () => {
    const fetch = mockFetch({ status: 200, body: {} }, { status: 200, body: {} });
    renderWithIntl(<VetsAdmin rows={[helena]} specialties={specialties} />);
    const select = screen.getByLabelText('Especialidade para Helena Costa');
    expect(within(select).queryByRole('option', { name: 'Radiologia' })).toBeNull();
    const add = screen.getByRole('button', { name: 'Acrescentar especialidade' });
    expect(add).toBeDisabled();
    await userEvent.selectOptions(select, 'Cirurgia');
    await userEvent.click(add);
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/admin/vets/3');
    expect(sentBody(fetch)).toEqual({ version: 1, addSpecialtyId: 1 });
    await userEvent.click(screen.getByRole('button', { name: 'Desligar Helena Costa' }));
    expect(sentBody(fetch, 1)).toEqual({ version: 1, status: 'dismissed' });
  });
});

describe('indicadores (008/T021, D27)', () => {
  it('números sem dado pessoal e a barra de situações com resumo e legenda escritos', () => {
    renderWithIntl(
      <Indicators
        metrics={{
          owners: 1200,
          pets: 2,
          encounters: 5,
          pendingRecord: 1,
          anonymizations: 0,
          noShowRate: 12.5,
          appointmentsByStatus: { scheduled: 3, done: 5, no_show: 1 },
        }}
      />,
    );
    expect(screen.getByText('1.200')).toBeInTheDocument();
    expect(screen.getByText('12,5%')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Agendada: 3, Realizada: 5, Cancelada: 0, Não compareceu: 1',
    );
    const legend = screen.getByRole('list');
    expect(within(legend).getAllByRole('listitem')).toHaveLength(4);
  });

  it('sem agendamento nenhum, só a legenda', () => {
    renderWithIntl(<Indicators metrics={{}} />);
    expect(screen.queryByRole('img')).toBeNull();
  });
});
