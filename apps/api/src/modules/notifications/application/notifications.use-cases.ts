import { type Metrics, NO_METRICS } from '../../../shared/domain/metrics';
import type { Clock } from '../../../shared/domain/clock';
import type { MessageQueue, OutboxRepository, OwnerNotifier } from './ports/notification.port';

const tomorrowIn = (now: Date): string =>
  new Date(now.getTime() + 24 * 3600_000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

/** 004/T023, T024: publica a caixa de saída, entrega pela porta e agenda os lembretes do D-1. */
export class Notifications {
  constructor(
    private readonly outbox: OutboxRepository,
    private readonly queue: MessageQueue,
    private readonly notifier: OwnerNotifier,
    private readonly clock: Clock,
    private readonly metrics: Metrics = NO_METRICS,
  ) {}

  /** Leva à fila o que a transação do agendamento gravou na caixa de saída. */
  async publishPending(limit = 50): Promise<number> {
    const ids = await this.outbox.pending(limit);
    for (const id of ids) {
      await this.queue.publish(id);
      await this.outbox.markPublished(id);
      this.metrics.increment('whatsapp_enqueued');
    }
    return ids.length;
  }

  /** Entrega uma mensagem; sem consentimento (D12), não envia e não falha. Erro sobe para a retentativa. */
  async deliver(outboxId: number): Promise<'sent' | 'skipped' | 'gone'> {
    const d = await this.outbox.delivery(outboxId);
    if (!d) return 'gone';
    if (!d.consent) {
      await this.outbox.mark(outboxId, 'skipped');
      this.metrics.increment('whatsapp_skipped_no_consent', { type: d.kind });
      return 'skipped';
    }
    await this.notifier.send(d.to, d.kind, d.facts);
    await this.outbox.mark(outboxId, 'sent');
    this.metrics.increment('whatsapp_sent', { type: d.kind });
    return 'sent';
  }

  failed(outboxId: number): Promise<void> {
    this.metrics.increment('whatsapp_failed');
    return this.outbox.mark(outboxId, 'failed');
  }

  /** T024: rodar duas vezes no mesmo dia não duplica envio (um por agendamento e tipo). */
  enqueueReminders(): Promise<number> {
    return this.outbox.enqueueReminders(tomorrowIn(this.clock.now()));
  }
}
