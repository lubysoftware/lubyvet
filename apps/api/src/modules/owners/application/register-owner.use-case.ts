import { type Metrics, NO_METRICS } from '../../../shared/domain/metrics';
import type { Clock } from '../../../shared/domain/clock';
import { Owner, type RegisterOwnerFields } from '../domain/owner';
import { SimilarOwnerFound } from '../domain/owner.errors';
import type { OwnerRepository } from './ports/owner-repository.port';

/**
 * Cadastrar dono (US-1). D14: se o celular já pertence a outro dono, o candidato é apresentado
 * antes de gravar; com a confirmação explícita, grava e registra que o aviso foi dispensado.
 */
export class RegisterOwner {
  constructor(
    private readonly owners: OwnerRepository,
    private readonly clock: Clock,
    private readonly metrics: Metrics = NO_METRICS,
  ) {}

  async execute(fields: RegisterOwnerFields, confirmSimilar = false): Promise<Owner> {
    const now = this.clock.now();
    const owner = Owner.register(fields, now);
    const similar = await this.owners.findByTelephone(owner.telephone);
    if (similar.length > 0) {
      if (!confirmSimilar) {
        this.metrics.increment('similar_owner_shown');
        throw new SimilarOwnerFound(similar);
      }
      owner.dismissSimilarity(now);
      this.metrics.increment('similar_owner_dismissed');
    }
    const saved = await this.owners.insert(owner);
    this.metrics.increment('owners_created');
    return saved;
  }
}
