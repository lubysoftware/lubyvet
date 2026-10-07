import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { DomainErrorFilter } from './shared/interface/http/domain-error.filter';

/** Configuração comum à API real e aos testes de ponta a ponta. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalFilters(new DomainErrorFilter());
}
