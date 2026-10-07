import type { NextFunction, Request, Response } from 'express';
import { logger } from '../../infra/logger';

const WRITES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * 008/CA-5.2: toda escrita fica no log com momento (o `time` do pino), caminho, resultado e
 * duração. Só o caminho, nunca o corpo nem a query: nenhum dado pessoal (P-16).
 */
export function writeLog(req: Request, res: Response, next: NextFunction): void {
  if (!WRITES.has(req.method)) return next();
  const start = performance.now();
  res.on('finish', () =>
    logger.info(
      {
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        ms: Math.round(performance.now() - start),
      },
      'escrita',
    ),
  );
  next();
}
