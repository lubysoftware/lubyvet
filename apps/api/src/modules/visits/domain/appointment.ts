import { VISIT_LIMITS, type AppointmentStatus } from '@lubyvet/contracts';
import {
  FieldRuleViolation,
  InvalidTransition,
  StaleVersion,
  type FieldViolation,
} from '../../../shared/domain/errors';
import { appointmentAccepts } from './date-policy';

export interface StatusChange {
  from: AppointmentStatus | null;
  to: AppointmentStatus;
  at: Date;
}

export interface AppointmentProps {
  id: number | undefined;
  petId: number;
  scheduledAt: Date;
  description: string;
  status: AppointmentStatus;
  version: number;
  history: StatusChange[];
}

function checkDescription(value: string, v: FieldViolation[]): string {
  const d = value.trim();
  if (d === '') v.push({ path: 'description', code: 'required' });
  else if (d.length > VISIT_LIMITS.description) v.push({ path: 'description', code: 'too_long' });
  return d;
}

function checkDate(at: Date, now: Date, v: FieldViolation[]): void {
  if (Number.isNaN(at.getTime())) v.push({ path: 'scheduledAt', code: 'invalid_format' });
  else if (!appointmentAccepts(at, now)) v.push({ path: 'scheduledAt', code: 'date_in_past' });
}

/** Agendamento (Pergunta 1): compromisso futuro. D10: os destinos Realizada, Cancelada e Não compareceu são finais. */
export class Appointment {
  private pending: StatusChange[] = [];
  private constructor(private props: AppointmentProps) {}

  static schedule(petId: number, input: { scheduledAt: Date; description: string }, now: Date): Appointment {
    const v: FieldViolation[] = [];
    const description = checkDescription(input.description, v);
    checkDate(input.scheduledAt, now, v);
    if (v.length) throw new FieldRuleViolation(v);
    const a = new Appointment({
      id: undefined,
      petId,
      scheduledAt: input.scheduledAt,
      description,
      status: 'scheduled',
      version: 0,
      history: [],
    });
    a.record(null, 'scheduled', now);
    return a;
  }

  static restore(props: AppointmentProps): Appointment {
    return new Appointment({ ...props, history: [...props.history] });
  }

  get id(): number | undefined {
    return this.props.id;
  }
  get petId(): number {
    return this.props.petId;
  }
  get status(): AppointmentStatus {
    return this.props.status;
  }
  snapshot(): Readonly<AppointmentProps> {
    return { ...this.props, history: [...this.props.history] };
  }
  /** Mudanças de situação ainda não gravadas (o adaptador as insere). */
  newChanges(): readonly StatusChange[] {
    return this.pending;
  }

  /** D11: derivado na leitura; ninguém muda a situação com o tempo. */
  isPendingRecord(now: Date): boolean {
    return this.props.status === 'scheduled' && this.props.scheduledAt.getTime() <= now.getTime();
  }

  /** 004/T017: remarcar só um agendamento ainda futuro, para outra data futura. */
  reschedule(
    input: { scheduledAt?: Date | undefined; description?: string | undefined },
    version: number,
    now: Date,
  ): void {
    this.guardVersion(version);
    this.guardFutureScheduled(now);
    const v: FieldViolation[] = [];
    const description =
      input.description !== undefined ? checkDescription(input.description, v) : this.props.description;
    if (input.scheduledAt) checkDate(input.scheduledAt, now, v);
    if (v.length) throw new FieldRuleViolation(v);
    this.props.description = description;
    if (input.scheduledAt) this.props.scheduledAt = input.scheduledAt;
  }

  /** D10/T018: cancelar só antes da data, sem apagar nada. */
  cancel(version: number, now: Date): void {
    this.guardVersion(version);
    this.guardFutureScheduled(now);
    this.transition('cancelled', now);
  }

  /** D10: depois da data, sem atendimento registrado. */
  markNoShow(version: number, now: Date): void {
    this.guardVersion(version);
    if (this.props.status !== 'scheduled' || !this.isPendingRecord(now))
      throw new InvalidTransition('invalid_transition');
    this.transition('no_show', now);
  }

  /** Registrar o atendimento leva o agendamento para Realizada (D10). */
  markDone(version: number, now: Date): void {
    this.guardVersion(version);
    if (this.props.status !== 'scheduled') throw new InvalidTransition('invalid_transition');
    this.transition('done', now);
  }

  private guardVersion(version: number): void {
    if (version !== this.props.version) throw new StaleVersion(this.snapshot());
  }
  private guardFutureScheduled(now: Date): void {
    if (this.props.status !== 'scheduled' || this.isPendingRecord(now))
      throw new InvalidTransition('invalid_transition');
  }
  private transition(to: AppointmentStatus, now: Date): void {
    const from = this.props.status;
    this.props.status = to;
    this.record(from, to, now);
  }
  private record(from: AppointmentStatus | null, to: AppointmentStatus, at: Date): void {
    const change = { from, to, at };
    this.props.history.push(change);
    this.pending.push(change);
  }
}
