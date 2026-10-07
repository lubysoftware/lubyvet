import { randomUUID } from 'node:crypto';
import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ErrorEnvelope } from '@lubyvet/contracts';
import { logger } from '../../infra/logger';
import { DomainError, FieldRuleViolation, StaleVersion } from '../../domain/errors';

const STATUS: Record<DomainError['kind'], number> = {
  not_found: 404,
  rule: 422,
  conflict: 409,
  unauthenticated: 401,
  forbidden: 403,
  unsupported: 406,
};

/** Único ponto que traduz erro em status HTTP (docs/padroes/arquitetura.md). */
@Catch()
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof DomainError) {
      const error: ErrorEnvelope['error'] = { code: exception.code };
      if (exception instanceof FieldRuleViolation) error.fields = exception.fields;
      if (exception instanceof StaleVersion) error.current = exception.current;
      const extra = (exception as { candidates?: unknown }).candidates;
      if (extra !== undefined) error.current = extra;
      res.status(STATUS[exception.kind]).json({ error });
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code =
        status === 404
          ? 'not_found'
          : status === 401
            ? 'unauthenticated'
            : status === 403
              ? 'forbidden'
              : 'validation_failed';
      res.status(status === 400 ? 422 : status).json({ error: { code } });
      return;
    }
    // Falha inesperada: um identificador de ocorrência, gerado uma vez, no log e na resposta (008/US-1).
    const occurrenceId = randomUUID();
    // 008/CA-5.1: momento (time do pino), caminho pedido sem a query e o identificador da ocorrência.
    const http = host.switchToHttp() as { getRequest?: () => Request | undefined };
    const path = http.getRequest?.()?.originalUrl?.split('?')[0];
    logger.error(
      { occurrenceId, path, err: exception instanceof Error ? exception.name : 'unknown' },
      'falha inesperada',
    );
    res.status(500).json({ error: { code: 'internal_error', occurrenceId } });
  }
}
