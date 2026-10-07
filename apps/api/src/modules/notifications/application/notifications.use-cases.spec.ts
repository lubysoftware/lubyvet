import { FixedClock } from '../../../shared/domain/clock';
import { MetaWhatsAppNotifier } from '../infra/senders';
import { Notifications } from './notifications.use-cases';
import type {
  MessageQueue,
  OutboxDelivery,
  OutboxRepository,
  OwnerNotifier,
} from './ports/notification.port';

const facts = {
  ownerFirstName: 'Mariana',
  petName: 'Thor',
  scheduledAt: new Date('2026-10-10T12:30:00Z'),
  clinicName: 'C',
  clinicPhone: 'P',
};
const outbox = (delivery: OutboxDelivery | null) => {
  const log: unknown[] = [];
  const repo: OutboxRepository = {
    pending: async () => [1, 2],
    markPublished: async (id) => void log.push(['published', id]),
    delivery: async () => delivery,
    mark: async (id, s) => void log.push([s, id]),
    enqueueReminders: async (d) => (log.push(['reminders', d]), 3),
  };
  return { repo, log };
};
const queue: MessageQueue = { publish: async () => undefined };
const sent: unknown[] = [];
const notifier: OwnerNotifier = { send: async (...a) => void sent.push(a) };
const clock = FixedClock.at('2026-10-07T12:00:00-03:00');

describe('Notifications (004/T023, T024)', () => {
  it('publica a caixa de saída e entrega só com consentimento (D12)', async () => {
    const { repo, log } = outbox({ kind: 'confirmation', to: '+5511987654321', consent: true, facts });
    const n = new Notifications(repo, queue, notifier, clock);
    expect(await n.publishPending()).toBe(2);
    expect(await n.deliver(1)).toBe('sent');
    expect(log).toEqual([
      ['published', 1],
      ['published', 2],
      ['sent', 1],
    ]);
    expect(
      await new Notifications(
        outbox({ kind: 'reminder', to: 'x', consent: false, facts }).repo,
        queue,
        notifier,
        clock,
      ).deliver(1),
    ).toBe('skipped');
    expect(await new Notifications(outbox(null).repo, queue, notifier, clock).deliver(1)).toBe('gone');
  });

  it('enfileira os lembretes de amanhã no fuso de São Paulo e registra a falha', async () => {
    const { repo, log } = outbox(null);
    const n = new Notifications(repo, queue, notifier, clock);
    expect(await n.enqueueReminders()).toBe(3);
    await n.failed(9);
    expect(log).toEqual([
      ['reminders', '2026-10-08'],
      ['failed', 9],
    ]);
  });

  it('T025: o pedido à Meta usa o template, pt_BR e as variáveis na ordem de D28', async () => {
    expect(MetaWhatsAppNotifier.body('+5511987654321', 'reminder', facts)).toMatchObject({
      to: '5511987654321',
      template: {
        name: 'lubyvet_lembrete',
        language: { code: 'pt_BR' },
        components: [
          {
            parameters: [
              { text: 'Mariana' },
              { text: '10/10' },
              { text: '09:30' },
              { text: 'Thor' },
              { text: 'C' },
              { text: 'P' },
            ],
          },
        ],
      },
    });
    const calls: unknown[] = [];
    const ok = new MetaWhatsAppNotifier(
      'tok',
      '123',
      (async (...a: unknown[]) => (calls.push(a), { ok: true })) as unknown as typeof fetch,
    );
    await ok.send('+55', 'confirmation', facts);
    expect(calls[0]).toEqual([
      'https://graph.facebook.com/v21.0/123/messages',
      expect.objectContaining({ method: 'POST' }),
    ]);
    const bad = new MetaWhatsAppNotifier('tok', '123', (async () => ({
      ok: false,
      status: 400,
    })) as unknown as typeof fetch);
    await expect(bad.send('+55', 'confirmation', facts)).rejects.toThrow('meta_send_failed_400');
  });
});
