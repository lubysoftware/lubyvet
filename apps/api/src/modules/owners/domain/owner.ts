import {
  OWNER_LIMITS,
  isValidCpf,
  isValidEmail,
  normalizeBrazilianMobile,
  normalizeCpf,
} from '@lubyvet/contracts';
import { FieldRuleViolation, StaleVersion, type FieldViolation } from '../../../shared/domain/errors';

export interface OwnerContact {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  /** E.164 (D05). */
  telephone: string;
}

export interface OwnerProps extends OwnerContact {
  id: number | undefined;
  /** Só dígitos (D13); nulo apenas depois de anonimizado (D15, D24). */
  cpf: string | null;
  email: string | null;
  messagingConsentAt: Date | null;
  similarityDismissedAt: Date | null;
  version: number;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
}

export interface RegisterOwnerFields {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  telephone: string;
  cpf: string;
  email?: string | undefined;
  messagingConsent: boolean;
}

export interface ContactPatch {
  firstName?: string | undefined;
  lastName?: string | undefined;
  address?: string | undefined;
  city?: string | undefined;
  telephone?: string | undefined;
  email?: string | undefined;
  messagingConsent?: boolean | undefined;
}

type TextField = 'firstName' | 'lastName' | 'address' | 'city';
const TEXT_FIELDS: readonly TextField[] = ['firstName', 'lastName', 'address', 'city'];

/** Obrigatoriedade e tamanho dos campos de contato, iguais na criação e na alteração (T005, CA-4.3). */
export function checkText(field: TextField, value: string, violations: FieldViolation[]): string {
  const v = value.trim();
  if (v === '') violations.push({ path: field, code: 'required' });
  else if (v.length > OWNER_LIMITS[field]) violations.push({ path: field, code: 'too_long' });
  return v;
}

/** Regra única do celular (T006, D05): grava normalizado em E.164. */
export function checkTelephone(value: string, violations: FieldViolation[]): string {
  if (value.trim() === '') {
    violations.push({ path: 'telephone', code: 'required' });
    return '';
  }
  const e164 = normalizeBrazilianMobile(value);
  if (!e164) violations.push({ path: 'telephone', code: 'invalid_phone' });
  return e164 ?? value;
}

function checkEmail(value: string | undefined, violations: FieldViolation[]): string | null {
  if (value === undefined || value.trim() === '') return null;
  const v = value.trim();
  if (v.length > OWNER_LIMITS.email) violations.push({ path: 'email', code: 'too_long' });
  else if (!isValidEmail(v)) violations.push({ path: 'email', code: 'invalid_email' });
  return v;
}

/** Dono: raiz do agregado (P1). Animais e visitas só se alcançam por ele. */
export class Owner {
  /** D51: candidatos dispensados nesta gravação; não é coluna, vira uma linha de histórico cada. */
  private dismissed: readonly number[] = [];

  private constructor(private props: OwnerProps) {}

  static register(fields: RegisterOwnerFields, now: Date): Owner {
    const violations: FieldViolation[] = [];
    const contact = Object.fromEntries(
      TEXT_FIELDS.map((f) => [f, checkText(f, fields[f], violations)]),
    ) as Record<TextField, string>;
    const telephone = checkTelephone(fields.telephone, violations);
    const cpf = normalizeCpf(fields.cpf);
    if (cpf === '') violations.push({ path: 'cpf', code: 'required' });
    else if (!isValidCpf(cpf)) violations.push({ path: 'cpf', code: 'invalid_cpf' });
    const email = checkEmail(fields.email, violations);
    if (violations.length) throw new FieldRuleViolation(violations);
    return new Owner({
      id: undefined,
      ...contact,
      telephone,
      cpf,
      email,
      messagingConsentAt: fields.messagingConsent ? now : null,
      similarityDismissedAt: null,
      version: 0,
      createdAt: undefined,
      updatedAt: undefined,
    });
  }

  static restore(props: OwnerProps): Owner {
    return new Owner({ ...props });
  }

  /** P4: "novo" é exatamente "sem identificador". */
  isNew(): boolean {
    return this.props.id === undefined;
  }

  get id(): number | undefined {
    return this.props.id;
  }

  get version(): number {
    return this.props.version;
  }

  get telephone(): string {
    return this.props.telephone;
  }

  snapshot(): Readonly<OwnerProps> {
    return { ...this.props };
  }

  /**
   * CA-3.2: o aviso de dono parecido foi visto e dispensado. D51: guarda os candidatos
   * apresentados, para gravar uma linha por candidato com a mesma data da coluna (012/CA-3.4).
   */
  dismissSimilarity(now: Date, similarOwnerIds: readonly number[]): void {
    this.props.similarityDismissedAt = now;
    this.dismissed = [...similarOwnerIds];
  }

  /** D51: donos parecidos dispensados nesta gravação, ainda não gravados no histórico. */
  get dismissedSimilarOwnerIds(): readonly number[] {
    return this.dismissed;
  }

  /**
   * Alteração parcial (Pergunta 22, T009/T010) com marca de versão (T011, US-5): só grava
   * quando a versão lida é a atual.
   */
  changeContact(patch: ContactPatch, expectedVersion: number, now: Date): void {
    if (expectedVersion !== this.props.version) throw new StaleVersion(this.snapshot());
    const violations: FieldViolation[] = [];
    const next = { ...this.props };
    for (const f of TEXT_FIELDS) {
      const value = patch[f];
      if (value !== undefined) next[f] = checkText(f, value, violations);
    }
    if (patch.telephone !== undefined) next.telephone = checkTelephone(patch.telephone, violations);
    if (patch.email !== undefined) next.email = checkEmail(patch.email, violations);
    if (patch.messagingConsent !== undefined) {
      next.messagingConsentAt = patch.messagingConsent ? (this.props.messagingConsentAt ?? now) : null;
    }
    if (violations.length) throw new FieldRuleViolation(violations);
    this.props = next;
  }
}
