import 'reflect-metadata';
import { startTelemetry } from './shared/infra/telemetry';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap(): Promise<void> {
  startTelemetry('lubyvet-api');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  configureApp(app);
  await app.listen(Number(process.env.PORT ?? 3001));
}
void bootstrap();
