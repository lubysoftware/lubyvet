import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { requestContext } from './shared/context/request-context';
import { DomainErrorFilter } from './shared/interface/http/domain-error.filter';
import { writeLog } from './shared/interface/http/write-log.middleware';

/** Configuração comum à API real e aos testes de ponta a ponta. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  // 008/CA-2.2: a resposta não anuncia a biblioteca do servidor.
  (app.getHttpAdapter().getInstance() as { disable(setting: string): void }).disable('x-powered-by');
  app.use(writeLog);
  app.use(requestContext.middleware);
  app.use(cookieParser());
  app.useGlobalFilters(new DomainErrorFilter());
}
