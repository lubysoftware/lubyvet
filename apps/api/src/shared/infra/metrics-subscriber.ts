import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { DomainEvent } from '../domain/events';
import { METRICS, type Metrics } from '../domain/metrics';
import { InProcessEvents } from './in-process-events';

/**
 * 011/T012, D27: o único chamador da porta de métricas. Traduz cada evento de domínio no contador
 * de D27, com os mesmos nomes e rótulos de antes (008/CA-5.4). Mora no módulo compartilhado
 * porque a API e o worker do WhatsApp publicam eventos.
 */
export function countersFor(e: DomainEvent): Parameters<Metrics['increment']>[] {
  switch (e.type) {
    case 'owner_registered':
      return [['owners_created']];
    case 'similar_owner_warned':
      return [['similar_owner_shown']];
    case 'similar_owner_dismissed':
      return [['similar_owner_dismissed']];
    case 'owner_anonymized':
      return [['owners_anonymized']];
    case 'pet_registered':
      return [['pets_created']];
    case 'appointment_scheduled':
      return [['appointments_created']];
    case 'appointment_cancelled':
      return [['appointments_cancelled']];
    case 'appointment_no_show':
      return [['appointments_no_show']];
    case 'encounter_recorded': {
      // Por veterinário, o rótulo é o id, nunca o nome.
      const out: Parameters<Metrics['increment']>[] = [
        ['encounters_recorded', e.vetId === null ? {} : { vet_id: String(e.vetId) }],
      ];
      if (e.returnSuggested) out.push(['returns_suggested']);
      return out;
    }
    case 'whatsapp_enqueued':
      return [['whatsapp_enqueued']];
    case 'whatsapp_sent':
      return [['whatsapp_sent', { type: e.kind }]];
    case 'whatsapp_skipped_no_consent':
      return [['whatsapp_skipped_no_consent', { type: e.kind }]];
    case 'whatsapp_failed':
      return [['whatsapp_failed']];
  }
}

@Injectable()
export class MetricsSubscriber implements OnModuleInit {
  constructor(
    private readonly bus: InProcessEvents,
    @Inject(METRICS) private readonly metrics: Metrics,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe((e) => {
      for (const args of countersFor(e)) this.metrics.increment(...args);
    });
  }
}
