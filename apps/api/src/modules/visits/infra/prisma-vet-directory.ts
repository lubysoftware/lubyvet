import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infra/prisma.service';
import type { VetDirectory } from '../application/visits.use-cases';

@Injectable()
export class PrismaVetDirectory implements VetDirectory {
  constructor(private readonly db: PrismaService) {}
  async exists(vetId: number): Promise<boolean> {
    return (await this.db.vet.count({ where: { id: vetId } })) > 0;
  }
}
