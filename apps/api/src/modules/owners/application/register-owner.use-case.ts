import type { Clock } from '../../../shared/domain/clock';
import { Owner, type RegisterOwnerFields } from '../domain/owner';
import type { OwnerRepository } from './ports/owner-repository.port';

/** Cadastrar dono (US-1): grava e devolve o dono com identificador, para a ficha. */
export class RegisterOwner {
  constructor(
    private readonly owners: OwnerRepository,
    private readonly clock: Clock,
  ) {}

  async execute(fields: RegisterOwnerFields): Promise<Owner> {
    const owner = Owner.register(fields, this.clock.now());
    return this.owners.insert(owner);
  }
}
