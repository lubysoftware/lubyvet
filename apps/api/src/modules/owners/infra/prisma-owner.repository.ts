import { Injectable } from '@nestjs/common';
import type { Owner as OwnerRow } from '../../../generated/prisma/client';
import { FieldRuleViolation, StaleVersion } from '../../../shared/domain/errors';
import { PrismaService } from '../../../shared/infra/prisma.service';
import { requestContext } from '../../../shared/context/request-context';
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

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

/**
 * 012/T003, D51: uma linha por candidato dispensado, na mesma transação do dono e com a mesma
 * data da coluna `similarity_dismissed_at` (CA-3.4). Quem dispensou é o usuário da requisição (D02).
 */
async function recordDismissals(tx: Tx, owner: Owner, ownerId: number): Promise<void> {
  const similarIds = owner.dismissedSimilarOwnerIds;
  const at = owner.snapshot().similarityDismissedAt;
  if (similarIds.length === 0 || at === null) return;
  const by = requestContext.actorId();
  if (by === null) throw new Error('dispensa do aviso de dono parecido sem usuário identificado');
  await tx.ownerSimilarityDismissal.createMany({
    data: similarIds.map((similarOwnerId) => ({ ownerId, similarOwnerId, dismissedBy: by, dismissedAt: at })),
  });
}

@Injectable()
export class PrismaOwnerRepository implements OwnerRepository {
  constructor(private readonly db: PrismaService) {}

  async insert(owner: Owner): Promise<Owner> {
    const s = owner.snapshot();
    const row = await this.db
      .$transaction(async (tx) => {
        const created = await tx.owner.create({
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
            createdBy: requestContext.actorId(),
            updatedBy: requestContext.actorId(),
          },
        });
        await recordDismissals(tx, owner, created.id);
        return created;
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
    const id = s.id;
    const count = await this.db
      .$transaction(async (tx) => {
        const res = await tx.owner.updateMany({
          where: { id, version: expectedVersion },
          data: {
            firstName: s.firstName,
            lastName: s.lastName,
            address: s.address,
            city: s.city,
            telephone: s.telephone,
            email: s.email,
            messagingConsentAt: s.messagingConsentAt,
            similarityDismissedAt: s.similarityDismissedAt,
            updatedBy: requestContext.actorId(),
            version: { increment: 1 },
          },
        });
        if (res.count > 0) await recordDismissals(tx, owner, id);
        return res.count;
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
