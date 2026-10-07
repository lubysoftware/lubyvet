import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/render';
import { mockFetch, sentBody } from '@/test/fetch';
import { Indicators } from './indicators';
import { SpeciesAdmin, VetsAdmin } from './vocabulary-admin';

const reload = vi.fn();
beforeEach(() => {
  reload.mockReset();
  Object.defineProperty(window, 'location', { value: { reload }, writable: true });
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
  it('inclui e desliga; especialidades pelo nome conhecido', async () => {
    const fetch = mockFetch({ status: 201, body: {} }, { status: 200, body: {} });
    renderWithIntl(
      <VetsAdmin
        rows={[
          {
            id: 3,
            firstName: 'Helena',
            lastName: 'Costa',
            status: 'active',
            version: 1,
            specialtyIds: [1, 2],
          },
        ]}
        specialtyNames={{ 1: 'Radiologia' }}
      />,
    );
    expect(screen.getByRole('row', { name: /Helena Costa/ })).toHaveTextContent('Radiologia, #2');
    await userEvent.type(screen.getByLabelText('Nome'), 'Rui');
    await userEvent.type(screen.getByLabelText('Sobrenome'), 'Lima');
    await userEvent.click(screen.getByRole('button', { name: 'Incluir veterinário' }));
    expect(sentBody(fetch)).toEqual({ firstName: 'Rui', lastName: 'Lima', specialtyIds: [] });
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
