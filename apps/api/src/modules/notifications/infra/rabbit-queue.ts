import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import amqp, { type Channel, type ChannelModel, type ConsumeMessage } from 'amqplib';
import type { MessageQueue } from '../application/ports/notification.port';

export const QUEUE = 'lubyvet.notifications';
export const DEAD_LETTER = 'lubyvet.notifications.dlq';
export const MAX_ATTEMPTS = 5;

/** D12: fila durável com retentativa e fila de descarte. */
@Injectable()
export class RabbitQueue implements MessageQueue, OnModuleDestroy {
  private conn: ChannelModel | null = null;
  private channel: Channel | null = null;

  private async ch(): Promise<Channel> {
    if (this.channel) return this.channel;
    this.conn = await amqp.connect(process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5673');
    const ch = await this.conn.createChannel();
    await ch.assertQueue(DEAD_LETTER, { durable: true });
    await ch.assertQueue(QUEUE, { durable: true, deadLetterExchange: '', deadLetterRoutingKey: DEAD_LETTER });
    this.channel = ch;
    return ch;
  }

  async publish(outboxId: number, attempt = 1): Promise<void> {
    (await this.ch()).sendToQueue(QUEUE, Buffer.from(String(outboxId)), {
      persistent: true,
      headers: { 'x-attempt': attempt },
    });
  }

  /** Consome; erro republica até MAX_ATTEMPTS e depois vai para a fila de descarte. */
  async consume(
    handler: (outboxId: number) => Promise<void>,
    onDead: (outboxId: number) => Promise<void>,
  ): Promise<void> {
    const ch = await this.ch();
    await ch.prefetch(5);
    await ch.consume(QUEUE, (msg: ConsumeMessage | null) => {
      if (!msg) return;
      const id = Number(msg.content.toString());
      const attempt = Number(msg.properties.headers?.['x-attempt'] ?? 1);
      handler(id)
        .then(() => ch.ack(msg))
        .catch(async () => {
          if (attempt < MAX_ATTEMPTS) {
            await this.publish(id, attempt + 1);
            ch.ack(msg);
          } else {
            await onDead(id);
            ch.nack(msg, false, false);
          }
        });
    });
  }

  async deadLetterCount(): Promise<number> {
    return (await (await this.ch()).checkQueue(DEAD_LETTER)).messageCount;
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.conn?.close().catch(() => undefined);
  }
}
