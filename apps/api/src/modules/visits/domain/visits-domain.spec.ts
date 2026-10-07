import { FieldRuleViolation, InvalidTransition, StaleVersion } from '../../../shared/domain/errors';
import { Appointment } from './appointment';
import { Encounter } from './encounter';

const NOW = new Date('2026-10-07T12:00:00-03:00');
const LATER = new Date('2026-10-10T09:00:00-03:00');
const fields = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof FieldRuleViolation) return e.fields;
    throw e;
  }
  return [];
};
const scheduled = () => Appointment.schedule(3, { scheduledAt: LATER, description: 'Vacina' }, NOW);

describe('Appointment (D10, D11)', () => {
  it('agenda só no futuro, com descrição obrigatória até 255 (T005, T006)', () => {
    expect(fields(() => Appointment.schedule(3, { scheduledAt: NOW, description: '' }, NOW))).toEqual([
      { path: 'description', code: 'required' },
      { path: 'scheduledAt', code: 'date_in_past' },
    ]);
    expect(
      fields(() =>
        Appointment.schedule(3, { scheduledAt: new Date('x'), description: 'a'.repeat(256) }, NOW),
      ),
    ).toEqual([
      { path: 'description', code: 'too_long' },
      { path: 'scheduledAt', code: 'invalid_format' },
    ]);
  });

  it('nasce Agendada, com a mudança registrada e datada (T014)', () => {
    const a = scheduled();
    expect([a.status, a.petId, a.id]).toEqual(['scheduled', 3, undefined]);
    expect(a.newChanges()).toEqual([{ from: null, to: 'scheduled', at: NOW }]);
  });

  it('D11: pendente de registro quando a data passa e continua Agendada, sem mudar sozinha', () => {
    const a = scheduled();
    expect(a.isPendingRecord(NOW)).toBe(false);
    expect(a.isPendingRecord(new Date('2026-10-11T00:00:00-03:00'))).toBe(true);
    expect(a.status).toBe('scheduled');
  });

  it('remarca e cancela só antes da data; não compareceu só depois (T017, T018)', () => {
    const a = scheduled();
    a.reschedule({ scheduledAt: new Date('2026-10-12T09:00:00-03:00'), description: 'Vacina V10' }, 0, NOW);
    expect(fields(() => a.reschedule({ scheduledAt: NOW }, 0, NOW))).toEqual([
      { path: 'scheduledAt', code: 'date_in_past' },
    ]);
    expect(() => a.markNoShow(0, NOW)).toThrow(InvalidTransition);
    a.cancel(0, NOW);
    expect(a.status).toBe('cancelled');
    expect(() => a.cancel(0, NOW)).toThrow(InvalidTransition);
    const b = scheduled();
    const after = new Date('2026-10-11T00:00:00-03:00');
    expect(() => b.cancel(0, after)).toThrow(InvalidTransition);
    b.markNoShow(0, after);
    expect(b.status).toBe('no_show');
  });

  it('realizada é final e a versão vencida é recusada', () => {
    const a = scheduled();
    expect(() => a.markDone(1, NOW)).toThrow(StaleVersion);
    a.markDone(0, NOW);
    expect(() => a.markDone(0, NOW)).toThrow(InvalidTransition);
    expect(
      Appointment.restore(a.snapshot())
        .snapshot()
        .history.map((h) => h.to),
    ).toEqual(['scheduled', 'done']);
  });
});

describe('Encounter (D06, D26)', () => {
  const ok = { date: '2026-10-07', chiefComplaint: 'Vômito há 2 dias' };
  it('aceita hoje e qualquer data passada; recusa o futuro (D06)', () => {
    expect(fields(() => Encounter.record(3, null, ok, NOW))).toEqual([]);
    expect(fields(() => Encounter.record(3, null, { ...ok, date: '2001-01-01' }, NOW))).toEqual([]);
    expect(fields(() => Encounter.record(3, null, { ...ok, date: '2026-10-08' }, NOW))).toEqual([
      { path: 'date', code: 'date_in_future' },
    ]);
  });

  it('valida os campos clínicos de D26', () => {
    expect(
      fields(() =>
        Encounter.record(
          3,
          null,
          {
            date: '',
            chiefComplaint: ' ',
            weightKg: 0,
            diagnosis: 'a'.repeat(2001),
            conduct: 'b'.repeat(2001),
            returnDate: '2026-10-07',
          },
          NOW,
        ),
      ),
    ).toEqual([
      { path: 'date', code: 'required' },
      { path: 'chiefComplaint', code: 'required' },
      { path: 'weightKg', code: 'out_of_range' },
      { path: 'diagnosis', code: 'too_long' },
      { path: 'conduct', code: 'too_long' },
      { path: 'returnDate', code: 'date_in_past' },
    ]);
    expect(
      fields(() =>
        Encounter.record(
          3,
          null,
          { date: '2026-02-30', chiefComplaint: 'a'.repeat(501), returnDate: 'x' },
          NOW,
        ),
      ),
    ).toEqual([
      { path: 'date', code: 'invalid_format' },
      { path: 'chiefComplaint', code: 'too_long' },
      { path: 'returnDate', code: 'invalid_format' },
    ]);
  });

  it('guarda os campos opcionais e o veterinário (D01)', () => {
    const e = Encounter.record(
      3,
      9,
      {
        ...ok,
        weightKg: 12.4,
        diagnosis: ' Gastrite ',
        conduct: 'Dieta',
        returnDate: '2026-10-21',
        vetId: 2,
      },
      NOW,
    );
    expect(Encounter.restore(e.snapshot()).snapshot()).toMatchObject({
      appointmentId: 9,
      weightKg: 12.4,
      diagnosis: 'Gastrite',
      returnDate: '2026-10-21',
      vetId: 2,
    });
  });
});
