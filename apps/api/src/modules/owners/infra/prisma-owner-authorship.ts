import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infra/prisma.service';
import type { Authorship, OwnerAuthorshipReader } from '../application/ports/owner-repository.port';

@Injectable()
export class PrismaOwnerAuthorship implements OwnerAuthorshipReader {
  constructor(private readonly db: PrismaService) {}

  async authorship(ownerId: number): Promise<Authorship | null> {
    const o = await this.db.owner.findUnique({
      where: { id: ownerId },
      select: { createdBy: true, updatedBy: true, createdAt: true, updatedAt: true },
    });
    if (!o) return null;
    const ids = [o.createdBy, o.updatedBy].filter((x): x is number => x !== null);
    const users = new Map(
      (await this.db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map(
        (u) => [u.id, u],
      ),
    );
    const who = (id: number | null) => (id !== null ? (users.get(id) ?? null) : null);
    return {
      createdBy: who(o.createdBy),
      createdAt: o.createdAt.toISOString(),
      updatedBy: who(o.updatedBy),
      updatedAt: o.updatedAt.toISOString(),
    };
  }
}
