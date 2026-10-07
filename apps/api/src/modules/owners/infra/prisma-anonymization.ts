import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infra/prisma.service';
import type { AnonymizationPort, FreeTextSpan } from '../application/anonymize-owner.use-case';

const REMOVED = '[removido]';
const FIELDS = {
  appointment: ['description'],
  encounter: ['chiefComplaint', 'diagnosis', 'conduct'],
} as const;

@Injectable()
export class PrismaAnonymization implements AnonymizationPort {
  constructor(private readonly db: PrismaService) {}

  async identityOf(ownerId: number): Promise<{ terms: string[] } | null> {
    const o = await this.db.owner.findUnique({ where: { id: ownerId } });
    if (!o) return null;
    const terms = [
      o.firstName,
      o.lastName,
      o.cpf ?? '',
      o.telephone.replace(/\D/g, '').slice(2),
      o.email ?? '',
    ].filter(Boolean);
    return { terms };
  }

  async freeTexts(ownerId: number) {
    const [appts, encs] = await Promise.all([
      this.db.appointment.findMany({ where: { pet: { ownerId } }, select: { id: true, description: true } }),
      this.db.encounter.findMany({
        where: { pet: { ownerId } },
        select: { id: true, chiefComplaint: true, diagnosis: true, conduct: true },
      }),
    ]);
    return [
      ...appts.map((a) => ({
        entity: 'appointment' as const,
        id: a.id,
        field: 'description',
        text: a.description,
      })),
      ...encs.flatMap((e) =>
        FIELDS.encounter.map((f) => ({ entity: 'encounter' as const, id: e.id, field: f, text: e[f] ?? '' })),
      ),
    ].filter((t) => t.text);
  }

  /** D24: troca o identificável por marcadores, zera o CPF (D15) e grava o registro; animais e visitas ficam. */
  async anonymize(ownerId: number, at: Date, by: number, spans: FreeTextSpan[]): Promise<void> {
    await this.db.$transaction([
      this.db.owner.update({
        where: { id: ownerId },
        data: {
          firstName: 'Dono',
          lastName: 'anonimizado',
          address: '—',
          city: '—',
          telephone: '+550000000000',
          cpf: null,
          email: null,
          messagingConsentAt: null,
          similarityDismissedAt: null,
          version: { increment: 1 },
        },
      }),
      this.db.ownerAnonymization.upsert({
        where: { ownerId },
        create: { ownerId, anonymizedAt: at, anonymizedBy: by, pendingSpans: spans as unknown as object },
        update: {
          anonymizedAt: at,
          anonymizedBy: by,
          pendingSpans: spans as unknown as object,
          reviewedAt: null,
          reviewedBy: null,
        },
      }),
    ]);
  }

  async pending(ownerId: number): Promise<FreeTextSpan[] | null> {
    const r = await this.db.ownerAnonymization.findUnique({ where: { ownerId } });
    return r ? (r.pendingSpans as unknown as FreeTextSpan[]) : null;
  }

  async redact(ownerId: number, spans: FreeTextSpan[], at: Date, by: number): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const groups = new Map<string, FreeTextSpan[]>();
      for (const s of spans)
        groups.set(`${s.entity}:${s.id}:${s.field}`, [
          ...(groups.get(`${s.entity}:${s.id}:${s.field}`) ?? []),
          s,
        ]);
      for (const list of groups.values()) {
        const first = list[0];
        if (!first) continue;
        const row =
          first.entity === 'appointment'
            ? await tx.appointment.findUnique({ where: { id: first.id } })
            : await tx.encounter.findUnique({ where: { id: first.id } });
        let text = String((row as Record<string, unknown> | null)?.[first.field] ?? '');
        for (const s of [...list].sort((a, b) => b.start - a.start))
          text = text.slice(0, s.start) + REMOVED + text.slice(s.end);
        if (first.entity === 'appointment')
          await tx.appointment.update({ where: { id: first.id }, data: { description: text.slice(0, 255) } });
        else await tx.encounter.update({ where: { id: first.id }, data: { [first.field]: text } });
      }
      await tx.ownerAnonymization.update({
        where: { ownerId },
        data: { pendingSpans: [], reviewedAt: at, reviewedBy: by },
      });
    });
  }
}
