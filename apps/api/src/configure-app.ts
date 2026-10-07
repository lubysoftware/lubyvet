import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/** Configuração comum à API real e aos testes de ponta a ponta. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.use(cookieParser());
}
