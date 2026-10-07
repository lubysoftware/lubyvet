import { METRICS, type Metrics } from '../../shared/domain/metrics';
import { Module } from '@nestjs/common';
import { CLOCK, type Clock } from '../../shared/domain/clock';
import {
  MESSAGE_QUEUE,
  type MessageQueue,
  OUTBOX,
  OWNER_NOTIFIER,
  type OutboxRepository,
  type OwnerNotifier,
} from './application/ports/notification.port';
import { Notifications } from './application/notifications.use-cases';
import { PrismaOutbox } from './infra/prisma-outbox';
import { RabbitQueue } from './infra/rabbit-queue';
import { FakeOwnerNotifier, MetaWhatsAppNotifier } from './infra/senders';

@Module({
  providers: [
    RabbitQueue,
    { provide: MESSAGE_QUEUE, useExisting: RabbitQueue },
    { provide: OUTBOX, useClass: PrismaOutbox },
    // D28: adaptador real só com NOTIFIER=meta; o padrão é o falso.
    {
      provide: OWNER_NOTIFIER,
      useFactory: () =>
        process.env.NOTIFIER === 'meta' ? new MetaWhatsAppNotifier() : new FakeOwnerNotifier(),
    },
    {
      provide: Notifications,
      useFactory: (o: OutboxRepository, q: MessageQueue, n: OwnerNotifier, c: Clock, m: Metrics) =>
        new Notifications(o, q, n, c, m),
      inject: [OUTBOX, MESSAGE_QUEUE, OWNER_NOTIFIER, CLOCK, METRICS],
    },
  ],
  exports: [Notifications, RabbitQueue, OWNER_NOTIFIER],
})
export class NotificationsModule {}
