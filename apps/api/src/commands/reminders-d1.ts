import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Notifications } from '../modules/notifications/application/notifications.use-cases';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { SharedModule } from '../shared/infra/shared.module';
import { logger } from '../shared/infra/logger';

@Module({ imports: [SharedModule, NotificationsModule] })
class RemindersModule {}

/** D12/D29: chamado pelo CronJob às 10:00; enfileira um lembrete por agendamento de amanhã. */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(RemindersModule, { logger: false });
  const n = await app.get(Notifications).enqueueReminders();
  logger.info({ reminders: n }, 'lembretes do D-1 enfileirados');
  await app.close();
}
void main();
