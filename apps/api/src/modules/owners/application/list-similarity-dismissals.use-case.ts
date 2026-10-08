import { OwnerNotFound } from '../domain/owner.errors';
import type { SimilarityDismissal, SimilarityDismissalReader } from './ports/owner-repository.port';

export type { SimilarityDismissal };

/** 012/US-3, D51: quem dispensou o aviso de dono parecido, quando e contra qual dono (auditoria). */
export class ListSimilarityDismissals {
  constructor(private readonly reader: SimilarityDismissalReader) {}

  async execute(ownerId: number): Promise<SimilarityDismissal[]> {
    const list = await this.reader.dismissalsOf(ownerId);
    if (!list) throw new OwnerNotFound();
    return list;
  }
}
