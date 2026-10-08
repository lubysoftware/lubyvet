import { FieldRuleViolation, NotFound, StaleVersion } from '../../../shared/domain/errors';
import type { VetCatalogCache } from '../../vets/application/ports/vet-catalog.port';
import { checkVetNames } from '../../vets/application/ports/vet-catalog.port';
import type { SpeciesRow, VetRow, VocabularyRepository } from './ports/vocabulary.port';

export type { SpeciesRow, VetRow };

/** 009: manutenção de espécies e do quadro de veterinários; toda escrita invalida o catálogo (P-08). */
export class Vocabularies {
  constructor(
    private readonly repo: VocabularyRepository,
    private readonly catalog: VetCatalogCache,
  ) {}

  listSpecies(): Promise<SpeciesRow[]> {
    return this.repo.listSpecies();
  }

  /** T003: nome repetido, inclusive com outra caixa, é recusado (índice LOWER(name)). */
  createSpecies(name: string): Promise<SpeciesRow> {
    return this.repo.createSpecies(name.trim());
  }

  /**
   * T004: renomear mantém os animais vinculados (eles apontam para o id, P-10).
   * T006: espécie em uso não se apaga; sai de uso (Inativa) e deixa de ser oferecida.
   */
  async changeSpecies(
    id: number,
    version: number,
    data: { name?: string | undefined; status?: string | undefined },
  ): Promise<SpeciesRow> {
    const current = await this.repo.findSpecies(id);
    if (!current) throw new NotFound('species_not_found');
    const updated = await this.repo.updateSpecies(id, version, {
      name: data.name?.trim(),
      status: data.status,
    });
    if (!updated) throw new StaleVersion(current);
    return updated;
  }

  listSpecialties(): Promise<{ id: number; name: string }[]> {
    return this.repo.listSpecialties();
  }

  listVets(): Promise<VetRow[]> {
    return this.repo.listVets();
  }

  async createVet(firstName: string, lastName: string, specialtyIds: number[]): Promise<VetRow> {
    const names = checkVetNames(firstName, lastName);
    if (new Set(specialtyIds).size !== specialtyIds.length)
      throw new FieldRuleViolation([{ path: 'specialtyIds', code: 'specialty_already_linked' }]);
    const vet = await this.repo.createVet(names.firstName, names.lastName, specialtyIds);
    await this.catalog.invalidate();
    return vet;
  }

  /** T008/P-09: desligar e reativar; desligado sai do catálogo e da escolha no atendimento. */
  async changeVet(
    id: number,
    version: number,
    data: {
      firstName?: string | undefined;
      lastName?: string | undefined;
      status?: string | undefined;
      addSpecialtyId?: number | undefined;
    },
  ): Promise<VetRow> {
    const current = await this.repo.findVet(id);
    if (!current) throw new NotFound('vet_not_found');
    if (data.firstName !== undefined || data.lastName !== undefined)
      checkVetNames(data.firstName ?? current.firstName, data.lastName ?? current.lastName);
    const updated = await this.repo.updateVet(id, version, data);
    if (!updated) throw new StaleVersion(current);
    await this.catalog.invalidate();
    return updated;
  }
}
