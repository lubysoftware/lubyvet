import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infra/prisma.service';
import type { OutboxDelivery, OutboxRepository } from '../application/ports/notification.port';
import type { MessageKind } from '../domain/templates';

@Injectable()
export class PrismaOutbox implements OutboxRepository {
  constructor(private readonly db: PrismaService) {}

  async pending(limit: number): Promise<number[]> {
    return (
      await this.db.notificationOutbox.findMany({
        where: { status: 'pending' },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: limit,
      })
    ).map((r) => r.id);
  }

  async markPublished(id: number): Promise<void> {
    await this.db.notificationOutbox.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });
  }

  async mark(id: number, status: 'sent' | 'skipped' | 'failed'): Promise<void> {
    await this.db.notificationOutbox.update({
      where: { id },
      data: { status, attempts: { increment: 1 }, ...(status === 'sent' ? { sentAt: new Date() } : {}) },
    });
  }

  async delivery(id: number): Promise<OutboxDelivery | null> {
    const row = await this.db.notificationOutbox.findUnique({ where: { id } });
    if (!row) return null;
    const a = await this.db.appointment.findUnique({
      where: { id: row.appointmentId },
      include: { pet: { include: { owner: true } } },
    });
    if (!a) return null;
    const o = a.pet.owner;
    return {
      kind: row.kind as MessageKind,
      to: o.telephone,
      consent: o.messagingConsentAt !== null && a.status === 'scheduled',
      facts: {
        ownerFirstName: o.firstName,
        petName: a.pet.name,
        scheduledAt: a.scheduledAt,
        clinicName: process.env.CLINIC_NAME ?? '',
        clinicPhone: process.env.CLINIC_PHONE ?? '',
      },
    };
  }

  async enqueueReminders(tomorrow: string): Promise<number> {
    return this.db.$executeRaw`
      insert into notification_outbox (kind, appointment_id)
      select 'reminder', a.id from appointments a
      where a.status = 'scheduled' and (a.scheduled_at at time zone 'America/Sao_Paulo')::date = ${tomorrow}::date
      on conflict (appointment_id, kind) do nothing`;
  }
}
