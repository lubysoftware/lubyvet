import { Injectable } from '@nestjs/common';
import type { VetPatientsOutput } from '@lubyvet/contracts';
import { PrismaService } from '../../../shared/infra/prisma.service';
import type { VetPatientsReader } from '../application/ports/vet-catalog.port';

/** 004/CA-4.4: animais atendidos por um veterinário; o vínculo sobrevive ao desligamento (D01). */
@Injectable()
export class PrismaVetPatients implements VetPatientsReader {
  constructor(private readonly db: PrismaService) {}
  list(vetId: number): Promise<VetPatientsOutput> {
    return this.db.$queryRaw<VetPatientsOutput>`
      select p.id as "petId", p.name as "petName", p.owner_id as "ownerId", count(*)::int as encounters
      from encounters e join pets p on p.id = e.pet_id
      where e.vet_id = ${vetId}
      group by p.id, p.name, p.owner_id order by lower(p.name), p.id`;
  }
}
