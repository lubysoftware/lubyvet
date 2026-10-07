import { PET_LIMITS, type PetStatus } from '@lubyvet/contracts';
import {
  FieldRuleViolation,
  Forbidden,
  InvalidTransition,
  StaleVersion,
  type FieldViolation,
} from '../../../shared/domain/errors';

export interface PetProps {
  id: number | undefined;
  ownerId: number;
  name: string;
  /** YYYY-MM-DD */
  birthDate: string;
  speciesId: number;
  status: PetStatus;
  version: number;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
}

export interface PetFields {
  name: string;
  birthDate: string;
  speciesId: number | null | undefined;
}

export interface PetPatch {
  name?: string | undefined;
  birthDate?: string | undefined;
  speciesId?: number | null | undefined;
}

const isRealDate = (d: string): boolean => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return false;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return date.toISOString().slice(0, 10) === d;
};
const todayIn = (now: Date): string => now.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

/** Uma declaração só para nome, data e espécie, igual na criação e na alteração (T006, T007, CA-3.4). */
function check(fields: PetPatch, now: Date, partial: boolean, violations: FieldViolation[]): void {
  if (fields.name !== undefined || !partial) {
    const n = (fields.name ?? '').trim();
    if (n === '') violations.push({ path: 'name', code: 'required' });
    else if (n.length > PET_LIMITS.name) violations.push({ path: 'name', code: 'too_long' });
  }
  if (fields.birthDate !== undefined || !partial) {
    const d = fields.birthDate ?? '';
    if (d === '') violations.push({ path: 'birthDate', code: 'required' });
    else if (!isRealDate(d)) violations.push({ path: 'birthDate', code: 'invalid_format' });
    else if (d > todayIn(now)) violations.push({ path: 'birthDate', code: 'date_in_future' });
  }
  // Pergunta 5 (arbitragem de C1): espécie obrigatória sempre, inclusive na edição.
  if ((fields.speciesId !== undefined || !partial) && !fields.speciesId)
    violations.push({ path: 'speciesId', code: 'species_required' });
}

/** Animal: só existe dentro do dono (P1). */
export class Pet {
  private constructor(private props: PetProps) {}

  static register(ownerId: number, fields: PetFields, now: Date): Pet {
    const violations: FieldViolation[] = [];
    check(fields, now, false, violations);
    if (violations.length) throw new FieldRuleViolation(violations);
    return new Pet({
      id: undefined,
      ownerId,
      name: fields.name.trim(),
      birthDate: fields.birthDate,
      speciesId: fields.speciesId ?? 0,
      status: 'active',
      version: 0,
      createdAt: undefined,
      updatedAt: undefined,
    });
  }

  static restore(props: PetProps): Pet {
    return new Pet({ ...props });
  }

  /** P4: "novo" é "sem identificador"; governa a verificação preventiva de nome (T008). */
  isNew(): boolean {
    return this.props.id === undefined;
  }

  get id(): number | undefined {
    return this.props.id;
  }
  get ownerId(): number {
    return this.props.ownerId;
  }
  get name(): string {
    return this.props.name;
  }
  get speciesId(): number {
    return this.props.speciesId;
  }
  get status(): PetStatus {
    return this.props.status;
  }

  /** D09: Falecido e Transferido não aceitam agendamento novo (004/CA-4.6). */
  canBeScheduled(): boolean {
    return this.props.status === 'active';
  }

  /**
   * D09: Ativo vai para Falecido ou Transferido; a volta para Ativo é correção de erro e só o
   * Administrador faz. O animal continua na ficha e na unicidade de nome em qualquer situação.
   */
  changeStatus(next: PetStatus, actorIsAdmin: boolean): void {
    const current = this.props.status;
    if (next === current) return;
    if (next === 'active') {
      if (!actorIsAdmin) throw new Forbidden('forbidden');
    } else if (current !== 'active') {
      throw new InvalidTransition('invalid_transition');
    }
    this.props.status = next;
  }

  snapshot(): Readonly<PetProps> {
    return { ...this.props };
  }

  change(patch: PetPatch, expectedVersion: number, now: Date): void {
    if (expectedVersion !== this.props.version) throw new StaleVersion(this.snapshot());
    const violations: FieldViolation[] = [];
    check(patch, now, true, violations);
    if (violations.length) throw new FieldRuleViolation(violations);
    if (patch.name !== undefined) this.props.name = patch.name.trim();
    if (patch.birthDate !== undefined) this.props.birthDate = patch.birthDate;
    if (patch.speciesId) this.props.speciesId = patch.speciesId;
  }
}
