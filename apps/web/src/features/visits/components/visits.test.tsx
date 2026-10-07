import type { AppointmentOutput, EncounterOutput } from '@lubyvet/contracts';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/render';
import { mockFetch, sentBody, sentHeaders } from '@/test/fetch';
import { AppointmentActions } from './appointment-actions';
import { AppointmentEditor, EncounterEditor, appointmentInput, encounterInput } from './visit-editors';
import { VisitHistory } from './visit-history';

const reload = vi.fn();
const assign = vi.fn();
beforeEach(() => {
  reload.mockReset();
  assign.mockReset();
  Object.defineProperty(window, 'location', { value: { reload, assign }, writable: true });
});
afterEach(() => vi.unstubAllGlobals());

const appt = (over: Partial<AppointmentOutput>): AppointmentOutput => ({
  id: 1,
  petId: 4,
  scheduledAt: '2026-10-20T13:00:00Z',
  description: 'Vacina',
  status: 'scheduled',
  pendingRecord: false,
  version: 2,
  history: [],
  ...over,
});
const enc: EncounterOutput = {
  id: 3,
  petId: 4,
  appointmentId: null,
  date: '2026-10-01',
  chiefComplaint: 'Tosse',
  weightKg: 12.4,
  diagnosis: 'Gripe',
  conduct: 'Repouso',
  returnDate: '2026-10-15',
  vetId: 9,
  createdAt: '',
};

describe('histórico de visitas do animal (004/CA-4.3, D11)', () => {
  it('separa agendado, atendido e encerrado, com o selo da situação', () => {
    renderWithIntl(
      <VisitHistory
        appointments={[appt({}), appt({ id: 2, description: 'Antiga', status: 'cancelled' })]}
        encounters={[enc]}
        vetNames={{ 9: 'Helena Costa' }}
      />,
    );
    const scheduled = screen.getByRole('region', { name: 'Visitas agendadas' });
    expect(scheduled).toHaveTextContent('Vacina');
    expect(scheduled).toHaveTextContent('Agendada');
    expect(scheduled).not.toHaveTextContent('Antiga');
    const attended = screen.getByRole('region', { name: 'Atendimentos realizados' });
    expect(attended).toHaveTextContent('Tosse');
    expect(attended).toHaveTextContent('12,4');
    expect(attended).toHaveTextContent('Helena Costa');
    expect(attended).toHaveTextContent('Retorno em 15/10/2026');
    expect(screen.getByRole('region', { name: 'Visitas encerradas sem atendimento' })).toHaveTextContent(
      'Cancelada',
    );
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('pendente de registro destaca a linha e não oferece remarcar; o resto vai pelo dono', () => {
    renderWithIntl(
      <VisitHistory
        appointments={[appt({ pendingRecord: true })]}
        encounters={[]}
        basePath="/owners/7/pets/4"
        canWrite
      />,
    );
    const item = screen.getByText('Vacina').closest('li') as HTMLElement;
    expect(item.className).toContain('bg-status-pending-row');
    expect(within(item).getByText('Pendente de registro')).toBeInTheDocument();
    expect(within(item).queryByRole('link', { name: 'Remarcar' })).toBeNull();
    expect(within(item).getByRole('link', { name: 'Registrar atendimento' })).toHaveAttribute(
      'href',
      '/owners/7/pets/4/encounters/new?appointment=1&version=2',
    );
    expect(screen.getByText('Nenhum atendimento registrado.')).toBeInTheDocument();
  });
});

describe('cancelar e não comparecimento (004/US-5, D10)', () => {
  it('só grava depois da confirmação, com a versão e a Idempotency-Key', async () => {
    const fetch = mockFetch({ status: 200, body: appt({ status: 'cancelled' }) });
    renderWithIntl(<AppointmentActions path="/api/owners/7/pets/4/appointments/1" version={2} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar visita' }));
    expect(fetch).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: 'Cancelar esta visita?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar visita' }));
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/owners/7/pets/4/appointments/1/cancel');
    expect(sentBody(fetch)).toEqual({ version: 2 });
    expect(sentHeaders(fetch)['idempotency-key']).toBeTruthy();
    expect(reload).toHaveBeenCalled();
  });

  it('a recusa aparece e a tela não recarrega', async () => {
    mockFetch({ status: 422, body: { error: { code: 'invalid_transition' } } });
    renderWithIntl(<AppointmentActions path="/api/x" version={0} />);
    await userEvent.click(screen.getByRole('button', { name: 'Marcar não comparecimento' }));
    const dialog = screen.getByRole('dialog', { name: 'Marcar que o animal não compareceu?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Marcar não comparecimento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta mudança de situação não é permitida.');
    expect(reload).not.toHaveBeenCalled();
  });

  it('voltar fecha o diálogo sem gravar', async () => {
    const fetch = mockFetch();
    renderWithIntl(<AppointmentActions path="/api/x" version={0} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar visita' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Voltar' })[1]!);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('agendar, remarcar e registrar atendimento (004/US-1, US-3, US-4)', () => {
  it('converte o formulário para o contrato', () => {
    expect(appointmentInput({ scheduledAt: '', description: 'x' })).toEqual({
      scheduledAt: undefined,
      description: 'x',
    });
    expect(appointmentInput({ scheduledAt: '2026-10-20T10:00', description: 'x' }, 3)).toEqual({
      version: 3,
      scheduledAt: '2026-10-20T13:00:00.000Z',
      description: 'x',
    });
    expect(
      encounterInput(
        { date: '2026-10-01', chiefComplaint: 'Tosse', weightKg: '12,4', diagnosis: '', vetId: '9' },
        { id: 1, version: 2 },
      ),
    ).toEqual({
      appointmentId: 1,
      appointmentVersion: 2,
      date: '2026-10-01',
      chiefComplaint: 'Tosse',
      weightKg: 12.4,
      diagnosis: undefined,
      conduct: undefined,
      returnDate: undefined,
      vetId: 9,
    });
  });

  it('agenda e volta à ficha do animal; data passada vira erro no campo', async () => {
    const fetch = mockFetch(
      {
        status: 422,
        body: {
          error: { code: 'validation_failed', fields: [{ path: 'scheduledAt', code: 'date_in_past' }] },
        },
      },
      { status: 201, body: appt({}) },
    );
    renderWithIntl(<AppointmentEditor ownerId={7} petId={4} />);
    await userEvent.type(screen.getByLabelText('Data e hora'), '2026-10-20T10:00');
    await userEvent.type(screen.getByLabelText('Descrição'), 'Vacina');
    await userEvent.click(screen.getByRole('button', { name: 'Agendar visita' }));
    expect(screen.getByLabelText('Data e hora')).toHaveAccessibleDescription('A data precisa ser futura.');
    await userEvent.click(screen.getByRole('button', { name: 'Agendar visita' }));
    expect(fetch.mock.calls[1]?.[0]).toBe('/api/owners/7/pets/4/appointments');
    expect(assign).toHaveBeenCalledWith('/owners/7?pet=4&saved=appointmentSaved');
  });

  it('remarca com a versão lida e os valores atuais no formulário', async () => {
    const fetch = mockFetch({ status: 200, body: appt({}) });
    renderWithIntl(<AppointmentEditor ownerId={7} petId={4} appointment={appt({})} />);
    expect(screen.getByLabelText('Descrição')).toHaveValue('Vacina');
    await userEvent.click(screen.getByRole('button', { name: 'Agendar visita' }));
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/owners/7/pets/4/appointments/1');
    expect(sentBody(fetch)).toMatchObject({ version: 2, scheduledAt: '2026-10-20T13:00:00.000Z' });
  });

  it('registra o atendimento ligado ao agendamento, com o veterinário escolhido', async () => {
    const fetch = mockFetch({ status: 201, body: enc });
    renderWithIntl(
      <EncounterEditor
        ownerId={7}
        petId={4}
        appointment={{ id: 1, version: 2 }}
        vets={[{ value: '9', label: 'Helena Costa' }]}
        dates={{ today: '2026-10-07', firstReturn: '2026-10-08' }}
      />,
    );
    await userEvent.type(screen.getByLabelText('Queixa principal'), 'Tosse');
    await userEvent.selectOptions(screen.getByLabelText('Veterinário'), 'Helena Costa');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar atendimento' }));
    expect(sentBody(fetch)).toMatchObject({
      appointmentId: 1,
      appointmentVersion: 2,
      chiefComplaint: 'Tosse',
      vetId: 9,
    });
    expect(assign).toHaveBeenCalledWith('/owners/7?pet=4&saved=encounterSaved');
  });
});

describe('faixa de datas no formulário (004/T006)', () => {
  it('004/CA-1.4 o agendamento abre com a data sugerida e o campo não aceita antes do limite', () => {
    renderWithIntl(
      <AppointmentEditor
        ownerId={7}
        petId={4}
        limits={{ min: '2026-10-07T12:00', suggested: '2026-10-08T12:00' }}
      />,
    );
    expect(screen.getByLabelText('Data e hora')).toHaveValue('2026-10-08T12:00');
    expect(screen.getByLabelText('Data e hora')).toHaveAttribute('min', '2026-10-07T12:00');
  });

  it('004/CA-3.3 o atendimento sugere hoje, limita a data a hoje e o retorno a partir de amanhã', () => {
    renderWithIntl(
      <EncounterEditor
        ownerId={7}
        petId={4}
        vets={[]}
        dates={{ today: '2026-10-07', firstReturn: '2026-10-08' }}
      />,
    );
    expect(screen.getByLabelText('Data do atendimento')).toHaveValue('2026-10-07');
    expect(screen.getByLabelText('Data do atendimento')).toHaveAttribute('max', '2026-10-07');
    expect(screen.getByLabelText('Data de retorno')).toHaveAttribute('min', '2026-10-08');
  });
});
