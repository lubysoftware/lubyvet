import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { catchError, from, mergeMap, type Observable, of, throwError } from 'rxjs';
import { IdempotencyKeyRequired, RequestInProgress } from '../../domain/errors';
import { IdempotencyStore } from '../../infra/idempotency.store';

const WRITES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const KEY = /^[A-Za-z0-9_-]{8,100}$/;

/**
 * D16/P-25: toda gravação exige `Idempotency-Key`. Dois envios do mesmo formulário produzem uma
 * gravação só; a repetição recebe a resposta da primeira.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly store: IdempotencyStore,
    private readonly reflector: Reflector,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!WRITES.has(req.method) || req.path.startsWith('/api/session')) return next.handle();
    const key = req.header('idempotency-key');
    if (!key || !KEY.test(key))
      return throwError(() => new IdempotencyKeyRequired('idempotency_key_required'));
    const res = ctx.switchToHttp().getResponse<Response>();
    const status =
      this.reflector.get<number | undefined>(HTTP_CODE_METADATA, ctx.getHandler()) ??
      (req.method === 'POST' ? 201 : 200);

    return from(this.store.claim(key, req.method, req.path)).pipe(
      mergeMap((claimed) => (claimed ? this.run(key, status, next) : from(this.replay(key, res)))),
    );
  }

  private run(key: string, status: number, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      mergeMap((body) => from(this.store.complete(key, status, body)).pipe(mergeMap(() => of(body)))),
      catchError((err: unknown) => from(this.store.release(key)).pipe(mergeMap(() => throwError(() => err)))),
    );
  }

  private async replay(key: string, res: Response): Promise<unknown> {
    for (let i = 0; i < 50; i++) {
      const stored = await this.store.result(key);
      if (stored) {
        res.status(stored.status);
        return stored.body;
      }
      if (stored === undefined) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new RequestInProgress('request_in_progress');
  }
}
