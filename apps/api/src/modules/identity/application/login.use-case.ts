import type { Clock } from '../../../shared/domain/clock';
import { DomainError } from '../../../shared/domain/errors';
import type { PasswordHasher, SessionStore, UserRecord, UserStore } from './ports/identity.port';

/** T003: a recusa é genérica; não diz se o login existe, se a senha errou ou se está bloqueado. */
export class InvalidCredentials extends DomainError {
  readonly code = 'invalid_credentials';
  readonly kind = 'unauthenticated';
}

/** P-15: 5 tentativas erradas bloqueiam o login por 15 minutos. */
export const MAX_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

export class Login {
  constructor(
    private readonly users: UserStore,
    private readonly sessions: SessionStore,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
  ) {}

  async execute(login: string, password: string): Promise<{ token: string; user: UserRecord }> {
    const now = this.clock.now();
    const user = await this.users.byLogin(login.trim().toLowerCase());
    if (!user || user.status !== 'active' || (user.lockedUntil && user.lockedUntil > now))
      throw new InvalidCredentials('invalid_credentials');
    if (!(await this.hasher.verify(user.passwordHash, password))) {
      const attempts = user.failedAttempts + 1;
      await this.users.recordFailure(
        user.id,
        attempts,
        attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : null,
      );
      throw new InvalidCredentials('invalid_credentials');
    }
    await this.users.recordSuccess(user.id);
    return { token: await this.sessions.create(user.id), user };
  }
}
