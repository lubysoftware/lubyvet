import { NotFound } from '../../../shared/domain/errors';
import type { VetPatientsReader } from './ports/vet-catalog.port';

export type VetPatients = NonNullable<Awaited<ReturnType<VetPatientsReader['list']>>>;

/** 004/CA-4.4: os animais que o veterinário atendeu; veterinário inexistente é "não encontrado" (008/CA-1.1). */
export class ListVetPatients {
  constructor(private readonly patients: VetPatientsReader) {}

  async execute(vetId: number): Promise<VetPatients> {
    const found = await this.patients.list(vetId);
    if (!found) throw new NotFound('vet_not_found');
    return found;
  }
}
