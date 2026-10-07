import { act, screen } from '@testing-library/react';
import { renderWithIntl } from '@/test/render';
import { fieldErrorsFrom } from '../field-errors';
import { AppointmentForm, EncounterForm, OwnerForm, PetForm } from './forms';
import { RESULT_TTL_MS, ResultMessage } from './result-message';

const noop = () => undefined;

describe('modelo de erro e destaque nos quatro formulários (010/T007, T008)', () => {
  it('o 422 da API vira um código por campo', () => {
    expect(
      fieldErrorsFrom({ error: { code: 'validation_failed', fields: [{ path: 'cpf', code: 'cpf_taken' }] } }),
    ).toEqual({ cpf: 'cpf_taken' });
    expect(fieldErrorsFrom({ nada: 1 })).toEqual({});
  });

  it.each([
    [
      'dono',
      <OwnerForm key="o" errors={{ cpf: 'cpf_taken' }} onSubmit={noop} />,
      'CPF',
      'Este CPF já pertence a outro dono.',
    ],
    [
      'animal',
      <PetForm key="p" errors={{ speciesId: 'species_required' }} onSubmit={noop} />,
      'Espécie',
      'Escolha a espécie.',
    ],
    [
      'agendamento',
      <AppointmentForm key="a" errors={{ scheduledAt: 'date_in_past' }} onSubmit={noop} />,
      'Data e hora',
      'A data precisa ser futura.',
    ],
    [
      'atendimento',
      <EncounterForm key="e" errors={{ date: 'date_in_future' }} onSubmit={noop} />,
      'Data do atendimento',
      'A data não pode ser futura.',
    ],
  ])(
    'formulário de %s marca o campo com erro e mostra a mensagem do catálogo',
    (_n, form, label, message) => {
      renderWithIntl(form);
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAccessibleDescription(message);
    },
  );
});

describe('mensagem de resultado (001/T014, T015; 006/T006, T009)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('UT-007-3: ativa no limite do tempo e inativa no instante seguinte', () => {
    renderWithIntl(<ResultMessage code="ownerSaved" />);
    act(() => void vi.advanceTimersByTime(RESULT_TTL_MS - 1));
    expect(screen.getByRole('status')).toHaveTextContent('Dono gravado');
    act(() => void vi.advanceTimersByTime(1));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('UT-007-4: sem mensagem, nenhum temporizador é agendado', () => {
    renderWithIntl(<ResultMessage code={null} />);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('as mensagens de gravação e os rótulos saem do catálogo, nos dois idiomas', () => {
    renderWithIntl(<ResultMessage code="saveFailed" />, 'en');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
    renderWithIntl(<EncounterForm errors={{}} onSubmit={noop} />, 'en');
    expect(screen.getByLabelText('Chief complaint')).toBeInTheDocument();
  });
});
