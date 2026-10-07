import { Injectable } from '@nestjs/common';
import type { Owner as OwnerRow } from '../../../generated/prisma/client';
import { FieldRuleViolation, StaleVersion } from '../../../shared/domain/errors';
import { PrismaService } from '../../../shared/infra/prisma.service';
import { violatedUniqueConstraint } from '../../../shared/infra/unique-violation';
import type { OwnerRepository, SimilarCandidate } from '../application/ports/owner-repository.port';
import { Owner } from '../domain/owner';

const toDomain = (r: OwnerRow): Owner =>
  Owner.restore({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    address: r.address,
    city: r.city,
    telephone: r.telephone,
    cpf: r.cpf,
    email: r.email,
    messagingConsentAt: r.messagingConsentAt,
    similarityDismissedAt: r.similarityDismissedAt,
    version: r.version,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  });

/** D15/P6: CPF repetido vira erro do campo, reconhecido pelo nome da restrição. */
function translate(error: unknown): never {
  if (violatedUniqueConstraint(error) === 'owners_cpf_key')
    throw new FieldRuleViolation([{ path: 'cpf', code: 'cpf_taken' }]);
  throw error;
}

@Injectable()
export class PrismaOwnerRepository implements OwnerRepository {
  constructor(private readonly db: PrismaService) {}

  async insert(owner: Owner): Promise<Owner> {
    const s = owner.snapshot();
    const row = await this.db.owner
      .create({
        data: {
          firstName: s.firstName,
          lastName: s.lastName,
          address: s.address,
          city: s.city,
          telephone: s.telephone,
          cpf: s.cpf,
          email: s.email,
          messagingConsentAt: s.messagingConsentAt,
          similarityDismissedAt: s.similarityDismissedAt,
        },
      })
      .catch(translate);
    return toDomain(row);
  }

  async findById(id: number): Promise<Owner | null> {
    const row = await this.db.owner.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async update(owner: Owner, expectedVersion: number): Promise<Owner> {
    const s = owner.snapshot();
    if (s.id === undefined) throw new Error('update de dono sem identificador');
    const { count } = await this.db.owner
      .updateMany({
        where: { id: s.id, version: expectedVersion },
        data: {
          firstName: s.firstName,
          lastName: s.lastName,
          address: s.address,
          city: s.city,
          telephone: s.telephone,
          email: s.email,
          messagingConsentAt: s.messagingConsentAt,
          similarityDismissedAt: s.similarityDismissedAt,
          version: { increment: 1 },
        },
      })
      .catch(translate);
    const current = await this.db.owner.findUniqueOrThrow({ where: { id: s.id } });
    if (count === 0) throw new StaleVersion(toDomain(current).snapshot());
    return toDomain(current);
  }

  async findByTelephone(telephone: string, exceptId?: number): Promise<SimilarCandidate[]> {
    return this.db.owner.findMany({
      where: { telephone, ...(exceptId !== undefined ? { id: { not: exceptId } } : {}) },
      select: { id: true, firstName: true, lastName: true, city: true },
      orderBy: { id: 'asc' },
      take: 5,
    });
  }
}
