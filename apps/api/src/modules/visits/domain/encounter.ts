import { VISIT_LIMITS } from '@lubyvet/contracts';
import { FieldRuleViolation, type FieldViolation } from '../../../shared/domain/errors';
import { encounterAccepts, isRealDate, todayIn } from './date-policy';

export interface EncounterFields {
  date: string;
  chiefComplaint: string;
  weightKg?: number | undefined;
  diagnosis?: string | undefined;
  conduct?: string | undefined;
  returnDate?: string | undefined;
  vetId?: number | undefined;
}

export interface EncounterProps {
  id: number | undefined;
  petId: number;
  appointmentId: number | null;
  date: string;
  chiefComplaint: string;
  weightKg: number | null;
  diagnosis: string | null;
  conduct: string | null;
  returnDate: string | null;
  vetId: number | null;
  createdAt: Date | undefined;
}

const text = (path: string, value: string | undefined, max: number, v: FieldViolation[]): string | null => {
  if (value === undefined || value.trim() === '') return null;
  if (value.trim().length > max) v.push({ path, code: 'too_long' });
  return value.trim();
};

/** Atendimento (D26): registrado uma vez e imutável depois (004/T016). */
export class Encounter {
  private constructor(private readonly props: EncounterProps) {}

  static record(petId: number, appointmentId: number | null, f: EncounterFields, now: Date): Encounter {
    const v: FieldViolation[] = [];
    if (!f.date) v.push({ path: 'date', code: 'required' });
    else if (!isRealDate(f.date)) v.push({ path: 'date', code: 'invalid_format' });
    else if (!encounterAccepts(f.date, now)) v.push({ path: 'date', code: 'date_in_future' });
    const complaint = f.chiefComplaint.trim();
    if (complaint === '') v.push({ path: 'chiefComplaint', code: 'required' });
    else if (complaint.length > VISIT_LIMITS.chiefComplaint)
      v.push({ path: 'chiefComplaint', code: 'too_long' });
    if (
      f.weightKg !== undefined &&
      (f.weightKg < VISIT_LIMITS.weightMin || f.weightKg > VISIT_LIMITS.weightMax)
    )
      v.push({ path: 'weightKg', code: 'out_of_range' });
    const diagnosis = text('diagnosis', f.diagnosis, VISIT_LIMITS.diagnosis, v);
    const conduct = text('conduct', f.conduct, VISIT_LIMITS.conduct, v);
    if (f.returnDate !== undefined) {
      if (!isRealDate(f.returnDate)) v.push({ path: 'returnDate', code: 'invalid_format' });
      else if (f.returnDate <= todayIn(now)) v.push({ path: 'returnDate', code: 'date_in_past' });
    }
    if (v.length) throw new FieldRuleViolation(v);
    return new Encounter({
      id: undefined,
      petId,
      appointmentId,
      date: f.date,
      chiefComplaint: complaint,
      weightKg: f.weightKg ?? null,
      diagnosis,
      conduct,
      returnDate: f.returnDate ?? null,
      vetId: f.vetId ?? null,
      createdAt: undefined,
    });
  }

  static restore(props: EncounterProps): Encounter {
    return new Encounter({ ...props });
  }

  snapshot(): Readonly<EncounterProps> {
    return { ...this.props };
  }
}
