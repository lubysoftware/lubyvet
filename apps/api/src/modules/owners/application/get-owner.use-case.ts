import type { Owner } from '../domain/owner';
import { OwnerNotFound } from '../domain/owner.errors';
import type { OwnerRepository } from './ports/owner-repository.port';

/** Ler a ficha do dono (US-6): não grava nada. */
export class GetOwner {
  constructor(private readonly owners: OwnerRepository) {}

  async execute(id: number): Promise<Owner> {
    const owner = await this.owners.findById(id);
    if (!owner) throw new OwnerNotFound();
    return owner;
  }
}
