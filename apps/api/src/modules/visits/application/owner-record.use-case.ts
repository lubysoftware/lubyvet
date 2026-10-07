import type { Clock } from '../../../shared/domain/clock';
import { NotFound } from '../../../shared/domain/errors';
import type { OwnerRepository } from '../../owners/application/ports/owner-repository.port';
import type { Appointment } from '../domain/appointment';

export interface RecordPet {
  id: number;
  name: string;
  birthDate: string;
  species: { id: number; name: string };
  status: string;
  appointments: Appointment[];
  total: number;
}

export interface OwnerRecordReader {
  /** Animais em ordem alfabética, cada um com uma página de agendamentos em ordem crescente de data. */
  petsWithVisits(ownerId: number, offset: number, limit: number): Promise<RecordPet[]>;
}
export const OWNER_RECORD_READER = Symbol('OwnerRecordReader');

/** 001/T012: a ficha do dono; leitura pura, não grava nada (CA-6.5). */
export class GetOwnerRecord {
  constructor(
    private readonly owners: OwnerRepository,
    private readonly reader: OwnerRecordReader,
    private readonly clock: Clock,
  ) {}

  async execute(
    ownerId: number,
    page: number,
    pageSize: number,
  ): Promise<{ pets: RecordPet[]; page: number; pageSize: number; now: Date }> {
    if (!(await this.owners.findById(ownerId))) throw new NotFound('owner_not_found');
    const pets = await this.reader.petsWithVisits(ownerId, (page - 1) * pageSize, pageSize);
    return { pets, page, pageSize, now: this.clock.now() };
  }
}
