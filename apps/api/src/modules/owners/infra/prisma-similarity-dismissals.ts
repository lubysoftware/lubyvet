import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infra/prisma.service';
import type {
  SimilarityDismissal,
  SimilarityDismissalReader,
} from '../application/ports/owner-repository.port';

/** 012/T003, D51: leitura do histórico de dispensas, da mais recente para a mais antiga. */
@Injectable()
export class PrismaSimilarityDismissals implements SimilarityDismissalReader {
  constructor(private readonly db: PrismaService) {}

  async dismissalsOf(ownerId: number): Promise<SimilarityDismissal[] | null> {
    const owner = await this.db.owner.findUnique({ where: { id: ownerId }, select: { id: true } });
    if (!owner) return null;
    const rows = await this.db.ownerSimilarityDismissal.findMany({
      where: { ownerId },
      // Na mesma dispensa, os candidatos ficam na ordem em que foram apresentados.
      orderBy: [{ dismissedAt: 'desc' }, { id: 'asc' }],
      select: {
        dismissedAt: true,
        similarOwner: { select: { id: true, firstName: true, lastName: true } },
        dismisser: { select: { id: true, name: true } },
      },
    });
    return rows.map((r) => ({
      similarOwner: r.similarOwner,
      dismissedBy: r.dismisser,
      dismissedAt: r.dismissedAt,
    }));
  }
}
