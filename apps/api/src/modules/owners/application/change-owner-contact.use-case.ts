import { type DomainEvents, NO_EVENTS } from '../../../shared/domain/events';
import type { Clock } from '../../../shared/domain/clock';
import { FieldRuleViolation } from '../../../shared/domain/errors';
import type { ContactPatch, Owner } from '../domain/owner';
import { OwnerNotFound, SimilarOwnerFound } from '../domain/owner.errors';
import type { OwnerRepository } from './ports/owner-repository.port';

export interface ChangeOwnerContactCommand {
  ownerId: number;
  /** REG-05: id do corpo, quando enviado. */
  bodyId: number | undefined;
  version: number;
  patch: ContactPatch;
  /** D14: o usuário viu o aviso de dono parecido e decidiu gravar. */
  confirmSimilar?: boolean;
}

/** Alterar os dados de contato (US-4) com concorrência otimista (US-5). */
export class ChangeOwnerContact {
  constructor(
    private readonly owners: OwnerRepository,
    private readonly clock: Clock,
    private readonly events: DomainEvents = NO_EVENTS,
  ) {}

  async execute(cmd: ChangeOwnerContactCommand): Promise<Owner> {
    if (cmd.bodyId !== undefined && cmd.bodyId !== cmd.ownerId) {
      throw new FieldRuleViolation([{ path: 'id', code: 'id_mismatch' }]);
    }
    const owner = await this.owners.findById(cmd.ownerId);
    if (!owner) throw new OwnerNotFound();
    const now = this.clock.now();
    const before = owner.telephone;
    let dismissed = false;
    owner.changeContact(cmd.patch, cmd.version, now);
    if (owner.telephone !== before) {
      const similar = await this.owners.findByTelephone(owner.telephone, cmd.ownerId);
      if (similar.length > 0) {
        if (!cmd.confirmSimilar) {
          this.events.publish({ type: 'similar_owner_warned' });
          throw new SimilarOwnerFound(similar);
        }
        owner.dismissSimilarity(now);
        dismissed = true;
      }
    }
    const saved = await this.owners.update(owner, cmd.version);
    // A dispensa do aviso só conta depois de a gravação dar certo (011/CA-3.3).
    if (dismissed) this.events.publish({ type: 'similar_owner_dismissed' });
    return saved;
  }
}
