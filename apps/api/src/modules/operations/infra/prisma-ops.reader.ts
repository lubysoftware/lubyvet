import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infra/prisma.service';
import type { OpsReader } from '../application/ports/ops.port';

@Injectable()
export class PrismaOpsReader implements OpsReader {
  constructor(private readonly db: PrismaService) {}

  async databaseUp(): Promise<boolean> {
    try {
      await this.db.$queryRaw`select 1`;
      return true;
    } catch {
      return false;
    }
  }

  /** D27: agregados de agenda, atendimento e base de clientes. */
  async metrics(): Promise<Record<string, number | Record<string, number>>> {
    const byStatus = await this.db.appointment.groupBy({ by: ['status'], _count: true });
    const statuses = Object.fromEntries(byStatus.map((r) => [r.status, r._count]));
    const [pending, encounters, encountersByVet, owners, pets, anonymizations, queued] = await Promise.all([
      this.db.appointment.count({ where: { status: 'scheduled', scheduledAt: { lte: new Date() } } }),
      this.db.encounter.count(),
      this.db.encounter.groupBy({ by: ['vetId'], _count: true, where: { vetId: { not: null } } }),
      this.db.owner.count(),
      this.db.pet.count(),
      this.db.ownerAnonymization.count(),
      // D27: tamanho da fila, o que ainda não saiu para a Meta.
      this.db.notificationOutbox.count({ where: { status: { in: ['pending', 'published'] } } }),
    ]);
    const closed = (statuses.done ?? 0) + (statuses.no_show ?? 0);
    return {
      appointmentsByStatus: statuses,
      pendingRecord: pending,
      noShowRate: closed ? Math.round(((statuses.no_show ?? 0) / closed) * 1000) / 10 : 0,
      encounters,
      encountersByVet: Object.fromEntries(encountersByVet.map((r) => [String(r.vetId), r._count])),
      owners,
      pets,
      anonymizations,
      whatsappQueue: queued,
    };
  }
}
