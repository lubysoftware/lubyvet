import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/render';
import { mockFetch, sentBody } from '@/test/fetch';
import { Indicators } from './indicators';
import { SpecialtiesAdmin, SpeciesAdmin, VetsAdmin } from './vocabulary-admin';

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
    { id: 1, name: 'Cirurgia', status: 'active', version: 0, vetsCount: 0 },
    { id: 2, name: 'Odontologia', status: 'active', version: 0, vetsCount: 0 },
    { id: 3, name: 'Radiologia', status: 'active', version: 0, vetsCount: 1 },
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

describe('especialidades (012/US-4, D52)', () => {
  const rows = [
    { id: 1, name: 'Cirurgia', status: 'active', version: 2, vetsCount: 3 },
    { id: 4, name: 'Dermatologia', status: 'inactive', version: 1, vetsCount: 1 },
  ];
  const helena = {
    id: 3,
    firstName: 'Helena',
    lastName: 'Costa',
    status: 'active',
    version: 5,
    specialtyIds: [1, 4],
  };

  it('012/CA-4.7 a aba inclui especialidade pelo schema do contrato; nome repetido volta no campo', async () => {
    const fetch = mockFetch({
      status: 422,
      body: {
        error: { code: 'validation_failed', fields: [{ path: 'name', code: 'specialty_name_taken' }] },
      },
    });
    renderWithIntl(<SpecialtiesAdmin rows={rows} />);
    expect(screen.getByRole('row', { name: /Dermatologia/ })).toHaveTextContent('Inativa');
    await userEvent.type(screen.getByLabelText('Especialidade'), 'cirurgia');
    await userEvent.click(screen.getByRole('button', { name: 'Incluir especialidade' }));
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/admin/specialties');
    expect(sentBody(fetch)).toEqual({ name: 'cirurgia' });
    expect(screen.getByLabelText('Especialidade')).toHaveAccessibleDescription(
      'Já existe uma especialidade com esse nome.',
    );
  });

  it('012/CA-4.7 a aba renomeia com a versão lida, e o erro do nome fica no campo do novo nome', async () => {
    const fetch = mockFetch(
      {
        status: 422,
        body: {
          error: { code: 'validation_failed', fields: [{ path: 'name', code: 'specialty_name_taken' }] },
        },
      },
      { status: 200, body: {} },
    );
    renderWithIntl(<SpecialtiesAdmin rows={rows} />);
    await userEvent.click(screen.getByRole('button', { name: 'Renomear Cirurgia' }));
    const input = screen.getByLabelText('Novo nome de Cirurgia');
    await userEvent.clear(input);
    await userEvent.type(input, 'Dermatologia');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/admin/specialties/1');
    expect(sentBody(fetch)).toEqual({ version: 2, name: 'Dermatologia' });
    expect(input).toHaveAccessibleDescription('Já existe uma especialidade com esse nome.');
    expect(input).toHaveValue('Dermatologia');
    await userEvent.clear(input);
    await userEvent.type(input, 'Cirurgia geral');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(sentBody(fetch, 1)).toEqual({ version: 2, name: 'Cirurgia geral' });
    expect(reload).toHaveBeenCalled();
  });

  it('012/CA-4.7 cancelar a renomeação volta aos botões da linha', async () => {
    mockFetch();
    renderWithIntl(<SpecialtiesAdmin rows={rows} />);
    await userEvent.click(screen.getByRole('button', { name: 'Renomear Cirurgia' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByLabelText('Novo nome de Cirurgia')).toBeNull();
    expect(screen.getByRole('button', { name: 'Renomear Cirurgia' })).toBeInTheDocument();
  });

  it('012/CA-4.7 a aba inativa e reativa com a versão lida', async () => {
    const fetch = mockFetch({ status: 200, body: {} }, { status: 200, body: {} });
    renderWithIntl(<SpecialtiesAdmin rows={rows} />);
    await userEvent.click(screen.getByRole('button', { name: 'Inativar Cirurgia' }));
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/admin/specialties/1');
    expect(sentBody(fetch)).toEqual({ version: 2, status: 'inactive' });
    await userEvent.click(screen.getByRole('button', { name: 'Reativar Dermatologia' }));
    expect(sentBody(fetch, 1)).toEqual({ version: 1, status: 'active' });
  });

  it('012/CA-4.7 o veterinário tem botão de retirar cada especialidade, e só a ativa se oferece', async () => {
    const fetch = mockFetch({ status: 200, body: {} });
    renderWithIntl(<VetsAdmin rows={[{ ...helena, specialtyIds: [4] }, helena]} specialties={rows} />);
    expect(screen.queryByRole('checkbox', { name: 'Dermatologia' })).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Cirurgia' })).toBeInTheDocument();
    const select = screen.getAllByLabelText('Especialidade para Helena Costa')[0];
    if (!select) throw new Error('sem seleção de especialidade');
    expect(within(select).queryByRole('option', { name: 'Dermatologia' })).toBeNull();
    expect(within(select).getByRole('option', { name: 'Cirurgia' })).toBeInTheDocument();
    const remove = screen.getAllByRole('button', { name: 'Retirar Dermatologia de Helena Costa' });
    expect(remove).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Retirar Cirurgia de Helena Costa' }));
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/admin/vets/3');
    expect(sentBody(fetch)).toEqual({ version: 5, removeSpecialtyId: 1 });
    expect(reload).toHaveBeenCalled();
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
