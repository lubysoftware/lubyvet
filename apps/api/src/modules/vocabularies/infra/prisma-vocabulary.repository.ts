import { Injectable } from '@nestjs/common';
import { FieldRuleViolation } from '../../../shared/domain/errors';
import { PrismaService } from '../../../shared/infra/prisma.service';
import { isUniqueViolation, violatedUniqueConstraint } from '../../../shared/infra/unique-violation';
import type { SpeciesRow, VetRow, VocabularyRepository } from '../application/ports/vocabulary.port';

/** P6: violação reconhecida pelo tipo e pelo nome da restrição. */
function translate(error: unknown): never {
  if (isUniqueViolation(error)) {
    const name = violatedUniqueConstraint(error);
    if (name === 'species_lower_name_key')
      throw new FieldRuleViolation([{ path: 'name', code: 'species_name_taken' }]);
    if (name === 'vet_specialties_pkey' || name === null)
      throw new FieldRuleViolation([{ path: 'addSpecialtyId', code: 'specialty_already_linked' }]);
  }
  if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2003') {
    throw new FieldRuleViolation([{ path: 'specialtyIds', code: 'invalid_format' }]);
  }
  throw error;
}

@Injectable()
export class PrismaVocabularyRepository implements VocabularyRepository {
  constructor(private readonly db: PrismaService) {}

  private async species(id: number): Promise<SpeciesRow | null> {
    const r = await this.db.species.findUnique({
      where: { id },
      include: { _count: { select: { pets: true } } },
    });
    return r
      ? { id: r.id, name: r.name, status: r.status, version: r.version, petsCount: r._count.pets }
      : null;
  }
  findSpecies(id: number): Promise<SpeciesRow | null> {
    return this.species(id);
  }
  async listSpecies(): Promise<SpeciesRow[]> {
    const rows = await this.db.species.findMany({
      include: { _count: { select: { pets: true } } },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      version: r.version,
      petsCount: r._count.pets,
    }));
  }
  async createSpecies(name: string): Promise<SpeciesRow> {
    const r = await this.db.species.create({ data: { name } }).catch(translate);
    return { id: r.id, name: r.name, status: r.status, version: r.version, petsCount: 0 };
  }
  async updateSpecies(
    id: number,
    version: number,
    data: { name?: string | undefined; status?: string | undefined },
  ): Promise<SpeciesRow | null> {
    const { count } = await this.db.species
      .updateMany({
        where: { id, version },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.status ? { status: data.status } : {}),
          version: { increment: 1 },
        },
      })
      .catch(translate);
    return count ? this.species(id) : null;
  }

  private async vet(id: number): Promise<VetRow | null> {
    const r = await this.db.vet.findUnique({ where: { id }, include: { specialties: true } });
    return r
      ? {
          id: r.id,
          firstName: r.firstName,
          lastName: r.lastName,
          status: r.status,
          version: r.version,
          specialtyIds: r.specialties.map((s) => s.specialtyId).sort((a, b) => a - b),
        }
      : null;
  }
  findVet(id: number): Promise<VetRow | null> {
    return this.vet(id);
  }
  listSpecialties(): Promise<{ id: number; name: string }[]> {
    return this.db.specialty.findMany({
      select: { id: true, name: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }
  async listVets(): Promise<VetRow[]> {
    const ids = await this.db.vet.findMany({
      select: { id: true },
      orderBy: [{ lastName: 'asc' }, { id: 'asc' }],
    });
    return (await Promise.all(ids.map((r) => this.vet(r.id)))).filter((v): v is VetRow => v !== null);
  }
  async createVet(firstName: string, lastName: string, specialtyIds: number[]): Promise<VetRow> {
    const r = await this.db.vet
      .create({
        data: {
          firstName,
          lastName,
          specialties: { create: specialtyIds.map((specialtyId) => ({ specialtyId })) },
        },
      })
      .catch(translate);
    return (await this.vet(r.id)) as VetRow;
  }
  async updateVet(
    id: number,
    version: number,
    data: {
      firstName?: string | undefined;
      lastName?: string | undefined;
      status?: string | undefined;
      addSpecialtyId?: number | undefined;
    },
  ): Promise<VetRow | null> {
    const ok = await this.db
      .$transaction(async (tx) => {
        const { count } = await tx.vet.updateMany({
          where: { id, version },
          data: {
            ...(data.firstName ? { firstName: data.firstName.trim() } : {}),
            ...(data.lastName ? { lastName: data.lastName.trim() } : {}),
            ...(data.status ? { status: data.status } : {}),
            version: { increment: 1 },
          },
        });
        if (count && data.addSpecialtyId)
          await tx.vetSpecialty.create({ data: { vetId: id, specialtyId: data.addSpecialtyId } });
        return count > 0;
      })
      .catch(translate);
    return ok ? this.vet(id) : null;
  }
}
