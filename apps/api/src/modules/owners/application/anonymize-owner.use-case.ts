import type { Clock } from '../../../shared/domain/clock';
import { OwnerNotFound } from '../domain/owner.errors';

export interface FreeTextSpan {
  entity: 'appointment' | 'encounter';
  id: number;
  field: string;
  start: number;
  end: number;
}
export interface FreeTextItem extends FreeTextSpan {
  text: string;
}

/** Porta da anonimização: troca os dados do dono e registra a operação numa transação. */
export interface AnonymizationPort {
  identityOf(ownerId: number): Promise<{ terms: string[] } | null>;
  freeTexts(
    ownerId: number,
  ): Promise<{ entity: 'appointment' | 'encounter'; id: number; field: string; text: string }[]>;
  anonymize(ownerId: number, at: Date, by: number, spans: FreeTextSpan[]): Promise<void>;
  pending(ownerId: number): Promise<FreeTextSpan[] | null>;
  redact(ownerId: number, spans: FreeTextSpan[], at: Date, by: number): Promise<void>;
}
export const ANONYMIZATION = Symbol('Anonymization');

const fold = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** D25: acha nome, CPF e celular em texto livre, sem caixa, acento nem máscara. */
export function findSpans(text: string, terms: string[]): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  const folded = fold(text);
  for (const term of terms.map(fold).filter((t) => t.length >= 3)) {
    let i = folded.indexOf(term);
    while (i >= 0) {
      out.push({ start: i, end: i + term.length });
      i = folded.indexOf(term, i + term.length);
    }
  }
  // Números: compara só os dígitos, para pegar a mesma sequência com outra máscara.
  for (const term of terms.filter((t) => /^\d{8,}$/.test(t))) {
    const re = /[\d().\s-]{8,}/g;
    for (let m = re.exec(text); m; m = re.exec(text))
      if (m[0].replace(/\D/g, '').includes(term.slice(-8))) {
        const lead = m[0].length - m[0].trimStart().length;
        out.push({ start: m.index + lead, end: m.index + m[0].trimEnd().length });
      }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** 007/T009-T011, D24: anonimiza o dono, preserva o histórico e registra quem fez e quando. */
export class AnonymizeOwner {
  constructor(
    private readonly port: AnonymizationPort,
    private readonly clock: Clock,
  ) {}

  async execute(ownerId: number, actorId: number): Promise<{ pendingReview: number }> {
    const identity = await this.port.identityOf(ownerId);
    if (!identity) throw new OwnerNotFound();
    const spans: FreeTextSpan[] = [];
    for (const t of await this.port.freeTexts(ownerId))
      for (const s of findSpans(t.text, identity.terms))
        spans.push({ entity: t.entity, id: t.id, field: t.field, ...s });
    await this.port.anonymize(ownerId, this.clock.now(), actorId, spans);
    return { pendingReview: spans.length };
  }

  /** 007/T019: os trechos a revisar, com o texto atual. */
  async review(ownerId: number): Promise<FreeTextItem[]> {
    const spans = await this.port.pending(ownerId);
    if (!spans) throw new OwnerNotFound();
    const texts = await this.port.freeTexts(ownerId);
    return spans.map((s) => ({
      ...s,
      text: texts.find((t) => t.entity === s.entity && t.id === s.id && t.field === s.field)?.text ?? '',
    }));
  }

  /** 007/T019: troca os trechos confirmados por [removido]; o resto do texto fica. Encerra a revisão. */
  async redact(ownerId: number, confirmed: FreeTextSpan[], actorId: number): Promise<void> {
    const spans = await this.port.pending(ownerId);
    if (!spans) throw new OwnerNotFound();
    const valid = confirmed.filter((c) =>
      spans.some(
        (s) =>
          s.entity === c.entity &&
          s.id === c.id &&
          s.field === c.field &&
          s.start === c.start &&
          s.end === c.end,
      ),
    );
    await this.port.redact(ownerId, valid, this.clock.now(), actorId);
  }
}
