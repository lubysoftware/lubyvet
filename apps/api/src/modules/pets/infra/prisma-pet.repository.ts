import { Injectable } from '@nestjs/common';
import type { PetStatus } from '@lubyvet/contracts';
import type { Pet as PetRow } from '../../../generated/prisma/client';
import { StaleVersion } from '../../../shared/domain/errors';
import { PrismaService } from '../../../shared/infra/prisma.service';
import { requestContext } from '../../../shared/context/request-context';
import { isUniqueViolation, violatedUniqueConstraint } from '../../../shared/infra/unique-violation';
import type { PetRepository, SpeciesCatalog, SpeciesRef } from '../application/ports/pet-repository.port';
import { Pet } from '../domain/pet';
import { PetNameTaken } from '../domain/pet.errors';

const toDomain = (r: PetRow): Pet =>
  Pet.restore({
    id: r.id,
    ownerId: r.ownerId,
    name: r.name,
    birthDate: r.birthDate.toISOString().slice(0, 10),
    speciesId: r.speciesId,
    status: r.status as PetStatus,
    version: r.version,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  });

/**
 * T009, arbitragem de C2: a violação de unicidade é reconhecida pelo TIPO do erro. Com o nome da
 * restrição ou sem ele, vira erro no campo nome; o texto do banco nunca é lido.
 */
function translate(error: unknown): never {
  if (isUniqueViolation(error)) {
    const name = violatedUniqueConstraint(error);
    if (name === null || name === 'pets_owner_id_lower_name_key') throw new PetNameTaken();
  }
  throw error;
}

@Injectable()
export class PrismaPetRepository implements PetRepository {
  constructor(private readonly db: PrismaService) {}

  async insert(pet: Pet): Promise<Pet> {
    const s = pet.snapshot();
    const row = await this.db.pet
      .create({
        data: {
          createdBy: requestContext.actorId(),
          updatedBy: requestContext.actorId(),
          ownerId: s.ownerId,
          name: s.name,
          birthDate: new Date(`${s.birthDate}T00:00:00Z`),
          speciesId: s.speciesId,
        },
      })
      .catch(translate);
    return toDomain(row);
  }

  async findOfOwner(ownerId: number, petId: number): Promise<Pet | null> {
    const row = await this.db.pet.findFirst({ where: { id: petId, ownerId } });
    return row ? toDomain(row) : null;
  }

  async update(pet: Pet, expectedVersion: number): Promise<Pet> {
    const s = pet.snapshot();
    const id = s.id ?? 0;
    const { count } = await this.db.pet
      .updateMany({
        where: { id, ownerId: s.ownerId, version: expectedVersion },
        data: {
          updatedBy: requestContext.actorId(),
          name: s.name,
          birthDate: new Date(`${s.birthDate}T00:00:00Z`),
          speciesId: s.speciesId,
          status: s.status,
          version: { increment: 1 },
        },
      })
      .catch(translate);
    const current = await this.db.pet.findFirstOrThrow({ where: { id, ownerId: s.ownerId } });
    if (count === 0) throw new StaleVersion(toDomain(current).snapshot());
    return toDomain(current);
  }

  async nameTaken(ownerId: number, name: string, exceptPetId?: number): Promise<boolean> {
    const rows = await this.db.$queryRaw<{ n: number }[]>`
      select count(*)::int as n from pets
      where owner_id = ${ownerId} and lower(name) = lower(${name}) and id <> ${exceptPetId ?? 0}`;
    return (rows[0]?.n ?? 0) > 0;
  }
}

@Injectable()
export class PrismaSpeciesCatalog implements SpeciesCatalog {
  constructor(private readonly db: PrismaService) {}

  findById(id: number): Promise<SpeciesRef | null> {
    return this.db.species.findUnique({ where: { id }, select: { id: true, name: true, status: true } });
  }

  list(): Promise<SpeciesRef[]> {
    return this.db.species.findMany({
      where: { status: 'active' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async findByName(name: string): Promise<SpeciesRef | null> {
    const rows = await this.db.$queryRaw<
      SpeciesRef[]
    >`select id, name from species where lower(name) = lower(${name.trim()}) limit 1`;
    return rows[0] ?? null;
  }
}
