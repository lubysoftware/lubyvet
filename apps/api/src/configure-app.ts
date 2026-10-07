import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { requestContext } from './shared/context/request-context';
import { DomainErrorFilter } from './shared/interface/http/domain-error.filter';

/** Configuração comum à API real e aos testes de ponta a ponta. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.use(requestContext.middleware);
  app.use(cookieParser());
  app.useGlobalFilters(new DomainErrorFilter());
}
