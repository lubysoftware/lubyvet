import type { Clock } from '../../../shared/domain/clock';
import { FieldRuleViolation } from '../../../shared/domain/errors';
import type { ContactPatch, Owner } from '../domain/owner';
import { OwnerNotFound } from '../domain/owner.errors';
import type { OwnerRepository } from './ports/owner-repository.port';

export interface ChangeOwnerContactCommand {
  ownerId: number;
  /** REG-05: id do corpo, quando enviado. */
  bodyId: number | undefined;
  version: number;
  patch: ContactPatch;
}

/** Alterar os dados de contato (US-4) com concorrência otimista (US-5). */
export class ChangeOwnerContact {
  constructor(
    private readonly owners: OwnerRepository,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: ChangeOwnerContactCommand): Promise<Owner> {
    if (cmd.bodyId !== undefined && cmd.bodyId !== cmd.ownerId) {
      throw new FieldRuleViolation([{ path: 'id', code: 'id_mismatch' }]);
    }
    const owner = await this.owners.findById(cmd.ownerId);
    if (!owner) throw new OwnerNotFound();
    owner.changeContact(cmd.patch, cmd.version, this.clock.now());
    return this.owners.update(owner, cmd.version);
  }
}
