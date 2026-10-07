import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infra/prisma.service';
import type { OwnerSearchPort, OwnerSummaryRow } from '../application/ports/owner-search.port';

/** Prefixo para LIKE, com os curingas do usuário escapados. */
const prefix = (term: string): string => `${term.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

@Injectable()
export class PrismaOwnerSearch implements OwnerSearchPort {
  constructor(private readonly db: PrismaService) {}

  async count(lastNamePrefix: string): Promise<number> {
    const rows = await this.db.$queryRaw<{ n: number }[]>`
      select count(*)::int as n from owners where lower(last_name) like ${prefix(lastNamePrefix)} escape '\\'`;
    return rows[0]?.n ?? 0;
  }

  page(lastNamePrefix: string, offset: number, limit: number): Promise<OwnerSummaryRow[]> {
    // Ordem explícita e estável entre requisições: sobrenome, nome, identificador.
    return this.db.$queryRaw<OwnerSummaryRow[]>`
      select o.id, o.first_name as "firstName", o.last_name as "lastName", o.address, o.city, o.telephone,
             coalesce(array_agg(p.name order by lower(p.name)) filter (where p.id is not null), '{}') as "petNames"
      from (
        select * from owners where lower(last_name) like ${prefix(lastNamePrefix)} escape '\\'
        order by lower(last_name), lower(first_name), id
        limit ${limit} offset ${offset}
      ) o
      left join pets p on p.owner_id = o.id
      group by o.id, o.first_name, o.last_name, o.address, o.city, o.telephone
      order by lower(o.last_name), lower(o.first_name), o.id`;
  }
}
