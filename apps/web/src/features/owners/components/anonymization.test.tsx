import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/render';
import { mockFetch, sentBody } from '@/test/fetch';
import { AnonymizeOwner, FreeTextReview } from './anonymization';

const reload = vi.fn();
const assign = vi.fn();
beforeEach(() => {
  reload.mockReset();
  assign.mockReset();
  Object.defineProperty(window, 'location', { value: { reload, assign }, writable: true });
});
afterEach(() => vi.unstubAllGlobals());

async function confirm() {
  await userEvent.click(screen.getByRole('button', { name: 'Anonimizar dono' }));
  const dialog = screen.getByRole('dialog', { name: 'Anonimizar este dono?' });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Anonimizar dono' }));
}

describe('anonimização do dono (007/US-3, D24, D25)', () => {
  it('com texto livre a revisar, segue para a revisão', async () => {
    mockFetch({ status: 200, body: { pendingReview: 2 } });
    renderWithIntl(<AnonymizeOwner ownerId={7} />);
    await confirm();
    expect(assign).toHaveBeenCalledWith('/owners/7/free-text');
  });

  it('sem nada a revisar, volta à ficha; a recusa aparece', async () => {
    mockFetch(
      { status: 200, body: { pendingReview: 0 } },
      { status: 403, body: { error: { code: 'forbidden' } } },
    );
    renderWithIntl(<AnonymizeOwner ownerId={7} />);
    await confirm();
    expect(assign).toHaveBeenCalledWith('/owners/7');
    await confirm();
    expect(await screen.findByRole('alert')).toHaveTextContent('Seu papel não permite esta ação.');
  });

  it('007/CA-3.5 a revisão destaca cada trecho, todos marcados, e conclui num envio só com os confirmados', async () => {
    const fetch = mockFetch({ status: 204 });
    const name = {
      entity: 'encounter' as const,
      id: 4,
      field: 'conduct',
      start: 9,
      end: 16,
      text: 'Ligar p/ Mariana amanhã',
    };
    const phone = {
      entity: 'appointment' as const,
      id: 2,
      field: 'description',
      start: 0,
      end: 4,
      text: 'Rex no banho',
    };
    renderWithIntl(<FreeTextReview ownerId={7} items={[name, phone]} />);
    expect(screen.getByText('Mariana').tagName).toBe('MARK');
    expect(screen.getByText('Atendimento')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Remover “Rex ”' }));
    await userEvent.click(screen.getByRole('button', { name: 'Concluir revisão' }));
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/owners/7/free-text/redact');
    expect(sentBody(fetch)).toEqual({
      spans: [{ entity: 'encounter', id: 4, field: 'conduct', start: 9, end: 16 }],
    });
    expect(assign).toHaveBeenCalledWith('/owners/7');
  });

  it('a recusa da revisão aparece', async () => {
    mockFetch({ status: 403, body: { error: { code: 'forbidden' } } });
    renderWithIntl(
      <FreeTextReview
        ownerId={7}
        items={[{ entity: 'encounter', id: 1, field: 'conduct', start: 0, end: 3, text: 'Ana' }]}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Concluir revisão' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Seu papel não permite esta ação.');
  });

  it('sem trecho, diz que não há nada a revisar', () => {
    renderWithIntl(<FreeTextReview ownerId={7} items={[]} />);
    expect(screen.getByText('Nenhum trecho a revisar.')).toBeInTheDocument();
  });
});
