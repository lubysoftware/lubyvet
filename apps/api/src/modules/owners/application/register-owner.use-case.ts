import { type DomainEvents, NO_EVENTS } from '../../../shared/domain/events';
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
    private readonly events: DomainEvents = NO_EVENTS,
  ) {}

  async execute(fields: RegisterOwnerFields, confirmSimilar = false): Promise<Owner> {
    const now = this.clock.now();
    const owner = Owner.register(fields, now);
    const similar = await this.owners.findByTelephone(owner.telephone);
    if (similar.length > 0) {
      if (!confirmSimilar) {
        this.events.publish({ type: 'similar_owner_warned' });
        throw new SimilarOwnerFound(similar);
      }
      owner.dismissSimilarity(now);
      this.events.publish({ type: 'similar_owner_dismissed' });
    }
    const saved = await this.owners.insert(owner);
    this.events.publish({ type: 'owner_registered', ownerId: saved.id ?? 0 });
    return saved;
  }
}
