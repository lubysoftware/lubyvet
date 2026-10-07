import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infra/prisma.service';
import type { CatalogVet, VetCatalogReader } from '../application/ports/vet-catalog.port';

const key = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

@Injectable()
export class PrismaVetCatalogReader implements VetCatalogReader {
  constructor(private readonly db: PrismaService) {}

  count(): Promise<number> {
    return this.db.vet.count();
  }

  async page(offset: number, limit: number): Promise<CatalogVet[]> {
    const ids = await this.db.$queryRaw<{ id: number }[]>`
      select id from vets
      order by lower(translate(last_name, 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc')),
               lower(translate(first_name, 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc')), id
      limit ${limit} offset ${offset}`;
    const rows = await this.db.vet.findMany({
      where: { id: { in: ids.map((r) => r.id) } },
      include: { specialties: { include: { specialty: true } } },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.flatMap(({ id }) => {
      const r = byId.get(id);
      if (!r) return [];
      const specialties = r.specialties
        .map((s) => ({ id: s.specialty.id, name: s.specialty.name }))
        .sort((a, b) => key(a.name).localeCompare(key(b.name)));
      return [{ id: r.id, firstName: r.firstName, lastName: r.lastName, specialties }];
    });
  }
}
