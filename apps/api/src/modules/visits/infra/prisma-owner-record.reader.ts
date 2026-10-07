import { Injectable } from '@nestjs/common';
import type { AppointmentStatus } from '@lubyvet/contracts';
import { PrismaService } from '../../../shared/infra/prisma.service';
import type { OwnerRecordReader, RecordPet } from '../application/owner-record.use-case';
import { Appointment } from '../domain/appointment';

@Injectable()
export class PrismaOwnerRecordReader implements OwnerRecordReader {
  constructor(private readonly db: PrismaService) {}

  async petsWithVisits(ownerId: number, offset: number, limit: number): Promise<RecordPet[]> {
    const pets = await this.db.pet.findMany({
      where: { ownerId },
      include: {
        species: true,
        _count: { select: { appointments: true } },
        // Ordem crescente de data, estável para datas iguais (UT-006-7).
        appointments: {
          include: { changes: true },
          orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
          skip: offset,
          take: limit,
        },
      },
    });
    return pets
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) || a.id - b.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        birthDate: p.birthDate.toISOString().slice(0, 10),
        species: { id: p.species.id, name: p.species.name },
        status: p.status,
        total: p._count.appointments,
        appointments: p.appointments.map((r) =>
          Appointment.restore({
            id: r.id,
            petId: r.petId,
            scheduledAt: r.scheduledAt,
            description: r.description,
            status: r.status as AppointmentStatus,
            version: r.version,
            history: [...r.changes]
              .sort((x, y) => x.id - y.id)
              .map((c) => ({
                from: c.fromStatus as AppointmentStatus | null,
                to: c.toStatus as AppointmentStatus,
                at: c.changedAt,
              })),
          }),
        ),
      }));
  }
}
