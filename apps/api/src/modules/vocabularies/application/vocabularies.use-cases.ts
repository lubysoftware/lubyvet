import { FieldRuleViolation, NotFound, StaleVersion } from '../../../shared/domain/errors';
import type { VetCatalogCache } from '../../vets/application/ports/vet-catalog.port';
import { checkVetNames } from '../../vets/application/ports/vet-catalog.port';
import type { SpecialtyRow, SpeciesRow, VetRow, VocabularyRepository } from './ports/vocabulary.port';

export type { SpecialtyRow, SpeciesRow, VetRow };

type VetChange = {
  firstName?: string | undefined;
  lastName?: string | undefined;
  status?: string | undefined;
  addSpecialtyId?: number | undefined;
  removeSpecialtyId?: number | undefined;
};

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

  listSpecialties(): Promise<SpecialtyRow[]> {
    return this.repo.listSpecialties();
  }

  /** 012/CA-4.1, CA-4.3: nome repetido, inclusive com outra caixa, é recusado (índice LOWER(name)). */
  createSpecialty(name: string): Promise<SpecialtyRow> {
    return this.repo.createSpecialty(name.trim());
  }

  /**
   * 012/CA-4.2, CA-4.4 (D52): renomear e inativar com a versão lida. A especialidade inativa
   * continua nos veterinários que já a têm e no catálogo, que é invalidado porque mostra o nome.
   */
  async changeSpecialty(
    id: number,
    version: number,
    data: { name?: string | undefined; status?: string | undefined },
  ): Promise<SpecialtyRow> {
    const current = await this.repo.findSpecialty(id);
    if (!current) throw new NotFound('specialty_not_found');
    const updated = await this.repo.updateSpecialty(id, version, {
      name: data.name?.trim(),
      status: data.status,
    });
    if (!updated) throw new StaleVersion(current);
    await this.catalog.invalidate();
    return updated;
  }

  /** D52: especialidade inativa não se atribui mais. */
  private async refuseInactive(ids: number[], path: string): Promise<void> {
    if (ids.length === 0) return;
    if ((await this.repo.inactiveSpecialtyIds(ids)).length > 0)
      throw new FieldRuleViolation([{ path, code: 'specialty_inactive' }]);
  }

  listVets(): Promise<VetRow[]> {
    return this.repo.listVets();
  }

  async createVet(firstName: string, lastName: string, specialtyIds: number[]): Promise<VetRow> {
    const names = checkVetNames(firstName, lastName);
    if (new Set(specialtyIds).size !== specialtyIds.length)
      throw new FieldRuleViolation([{ path: 'specialtyIds', code: 'specialty_already_linked' }]);
    await this.refuseInactive(specialtyIds, 'specialtyIds');
    const vet = await this.repo.createVet(names.firstName, names.lastName, specialtyIds);
    await this.catalog.invalidate();
    return vet;
  }

  /**
   * T008/P-09: desligar e reativar; desligado sai do catálogo e da escolha no atendimento.
   * D52: `removeSpecialtyId` desfaz o vínculo, e o catálogo reflete na consulta seguinte.
   */
  async changeVet(id: number, version: number, data: VetChange): Promise<VetRow> {
    const current = await this.repo.findVet(id);
    if (!current) throw new NotFound('vet_not_found');
    if (data.firstName !== undefined || data.lastName !== undefined)
      checkVetNames(data.firstName ?? current.firstName, data.lastName ?? current.lastName);
    if (data.addSpecialtyId !== undefined) await this.refuseInactive([data.addSpecialtyId], 'addSpecialtyId');
    const updated = await this.repo.updateVet(id, version, data);
    if (!updated) throw new StaleVersion(current);
    await this.catalog.invalidate();
    return updated;
  }
}
