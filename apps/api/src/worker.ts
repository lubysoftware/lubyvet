import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { Notifications } from './modules/notifications/application/notifications.use-cases';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RabbitQueue } from './modules/notifications/infra/rabbit-queue';
import { SharedModule } from './shared/infra/shared.module';
import { logger } from './shared/infra/logger';

@Module({ imports: [SharedModule, NotificationsModule] })
class WorkerModule {}

/** D12: publica a caixa de saída e consome a fila de envio (P-18). */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, { logger: false });
  const notifications = app.get(Notifications);
  await app.get(RabbitQueue).consume(
    async (id) => void (await notifications.deliver(id)),
    (id) => notifications.failed(id),
  );
  setInterval(
    () =>
      void notifications.publishPending().catch((e: unknown) => logger.error({ err: String(e) }, 'outbox')),
    2000,
  );
}
void main();
