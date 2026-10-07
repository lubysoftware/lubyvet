import { Injectable } from '@nestjs/common';
import type { AppointmentStatus } from '@lubyvet/contracts';
import type { Prisma } from '../../../generated/prisma/client';
import { StaleVersion } from '../../../shared/domain/errors';
import { PrismaService } from '../../../shared/infra/prisma.service';
import { requestContext } from '../../../shared/context/request-context';
import type { VisitRepository } from '../application/ports/visit-repository.port';
import { Appointment } from '../domain/appointment';
import { Encounter } from '../domain/encounter';

type AppointmentRow = Prisma.AppointmentGetPayload<{ include: { changes: true } }>;
type EncounterRow = Prisma.EncounterGetPayload<object>;

const day = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);
const toDate = (s: string): Date => new Date(`${s}T00:00:00Z`);

const appointmentOf = (r: AppointmentRow): Appointment =>
  Appointment.restore({
    id: r.id,
    petId: r.petId,
    scheduledAt: r.scheduledAt,
    description: r.description,
    status: r.status as AppointmentStatus,
    version: r.version,
    history: [...r.changes]
      .sort((a, b) => a.id - b.id)
      .map((c) => ({
        from: c.fromStatus as AppointmentStatus | null,
        to: c.toStatus as AppointmentStatus,
        at: c.changedAt,
      })),
  });

const encounterOf = (r: EncounterRow): Encounter =>
  Encounter.restore({
    id: r.id,
    petId: r.petId,
    appointmentId: r.appointmentId,
    date: day(r.date) ?? '',
    chiefComplaint: r.chiefComplaint,
    weightKg: r.weightKg === null ? null : Number(r.weightKg),
    diagnosis: r.diagnosis,
    conduct: r.conduct,
    returnDate: day(r.returnDate),
    vetId: r.vetId,
    createdAt: r.createdAt,
  });

@Injectable()
export class PrismaVisitRepository implements VisitRepository {
  constructor(private readonly db: PrismaService) {}

  async insertAppointment(a: Appointment): Promise<Appointment> {
    const s = a.snapshot();
    const row = await this.db.appointment.create({
      data: {
        createdBy: requestContext.actorId(),
        updatedBy: requestContext.actorId(),
        petId: s.petId,
        scheduledAt: s.scheduledAt,
        description: s.description,
        status: s.status,
        changes: {
          create: a.newChanges().map((c) => ({ fromStatus: c.from, toStatus: c.to, changedAt: c.at })),
        },
      },
      include: { changes: true },
    });
    return appointmentOf(row);
  }

  async findAppointment(ownerId: number, petId: number, appointmentId: number): Promise<Appointment | null> {
    const row = await this.db.appointment.findFirst({
      where: { id: appointmentId, petId, pet: { ownerId } },
      include: { changes: true },
    });
    return row ? appointmentOf(row) : null;
  }

  async updateAppointment(a: Appointment, expectedVersion: number): Promise<Appointment> {
    return this.db.$transaction((tx) => this.update(tx, a, expectedVersion));
  }

  private async update(
    tx: Prisma.TransactionClient,
    a: Appointment,
    expectedVersion: number,
  ): Promise<Appointment> {
    const s = a.snapshot();
    const id = s.id ?? 0;
    const { count } = await tx.appointment.updateMany({
      where: { id, version: expectedVersion },
      data: {
        updatedBy: requestContext.actorId(),
        scheduledAt: s.scheduledAt,
        description: s.description,
        status: s.status,
        version: { increment: 1 },
      },
    });
    if (count === 0) {
      const current = await tx.appointment.findUniqueOrThrow({ where: { id }, include: { changes: true } });
      throw new StaleVersion(appointmentOf(current).snapshot());
    }
    if (a.newChanges().length) {
      await tx.appointmentStatusChange.createMany({
        data: a
          .newChanges()
          .map((c) => ({ appointmentId: id, fromStatus: c.from, toStatus: c.to, changedAt: c.at })),
      });
    }
    return appointmentOf(
      await tx.appointment.findUniqueOrThrow({ where: { id }, include: { changes: true } }),
    );
  }

  async recordEncounter(
    e: Encounter,
    realized?: { appointment: Appointment; version: number },
  ): Promise<Encounter> {
    const s = e.snapshot();
    return this.db.$transaction(async (tx) => {
      if (realized) await this.update(tx, realized.appointment, realized.version);
      const row = await tx.encounter.create({
        data: {
          createdBy: requestContext.actorId(),
          updatedBy: requestContext.actorId(),
          petId: s.petId,
          appointmentId: s.appointmentId,
          date: toDate(s.date),
          chiefComplaint: s.chiefComplaint,
          weightKg: s.weightKg,
          diagnosis: s.diagnosis,
          conduct: s.conduct,
          returnDate: s.returnDate ? toDate(s.returnDate) : null,
          vetId: s.vetId,
        },
      });
      return encounterOf(row);
    });
  }

  async listOfPet(petId: number): Promise<{ appointments: Appointment[]; encounters: Encounter[] }> {
    const [appointments, encounters] = await Promise.all([
      this.db.appointment.findMany({
        where: { petId },
        include: { changes: true },
        orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
      }),
      this.db.encounter.findMany({ where: { petId }, orderBy: [{ date: 'asc' }, { id: 'asc' }] }),
    ]);
    return { appointments: appointments.map(appointmentOf), encounters: encounters.map(encounterOf) };
  }
}
