import { OwnerNotFound } from '../domain/owner.errors';
import type { Authorship, OwnerAuthorshipReader } from './ports/owner-repository.port';

export type { Authorship };

/** 007/US-4: autoria consultável por cadastro, para todos os papéis; dono inexistente é não encontrado. */
export class GetAuthorship {
  constructor(private readonly reader: OwnerAuthorshipReader) {}

  async execute(ownerId: number): Promise<Authorship> {
    const a = await this.reader.authorship(ownerId);
    if (!a) throw new OwnerNotFound();
    return a;
  }
}
