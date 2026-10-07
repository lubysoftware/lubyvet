import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { Forbidden, Unauthenticated } from '../../../../shared/domain/errors';
import { requestContext } from '../../../../shared/context/request-context';
import { type Actor, ROUTE_ROLES } from '../../../../shared/interface/http/roles';
import {
  SESSION_STORE,
  type SessionStore,
  USER_STORE,
  type UserStore,
} from '../../application/ports/identity.port';

export const SESSION_COOKIE = 'lv_session';

/**
 * 007: decisão de autorização num ponto só (T005, CA-2.1). Rota fora da matriz é recusada por
 * padrão; toda rota não pública exige sessão válida antes de qualquer leitura (T006, D04).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(SESSION_STORE) private readonly sessions: SessionStore,
    @Inject(USER_STORE) private readonly users: UserStore,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { actor?: Actor }>();
    const pattern = `${req.method} ${(req.baseUrl ?? '') + ((req.route as { path?: string } | undefined)?.path ?? req.path)}`;
    const allowed = ROUTE_ROLES[pattern];
    if (allowed === 'public') return true;
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    const userId = token ? await this.sessions.touch(token) : null;
    const user = userId ? await this.users.byId(userId) : null;
    if (!user || user.status !== 'active') throw new Unauthenticated('unauthenticated');
    if (!allowed || !allowed.includes(user.role)) throw new Forbidden('forbidden');
    req.actor = { userId: user.id, role: user.role };
    // A partir daqui, o resto da requisição enxerga a identidade (D02).
    requestContext.set(user.id);
    return true;
  }
}
