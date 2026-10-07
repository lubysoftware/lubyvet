import type { Clock } from '../../../shared/domain/clock';
import { DomainError } from '../../../shared/domain/errors';
import { Account } from '../domain/account';
import type { PasswordHasher, SessionStore, UserRecord, UserStore } from './ports/identity.port';

export { LOCK_MINUTES, MAX_ATTEMPTS } from '../domain/account';

/** T003: a recusa é genérica; não diz se o login existe, se a senha errou ou se está bloqueado. */
export class InvalidCredentials extends DomainError {
  readonly code = 'invalid_credentials';
  readonly kind = 'unauthenticated';
}

/**
 * 011/T008: o login só orquestra. Lê o usuário pela porta, pede a decisão à conta (P-15 mora no
 * domínio) e grava o resultado. A senha só é conferida quando a conta pode tentar.
 */
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
    if (!user) throw new InvalidCredentials('invalid_credentials');
    const account = Account.restore(user);
    const passwordOk = account.canTry(now) && (await this.hasher.verify(user.passwordHash, password));
    const result = account.attempt(passwordOk, now);
    if (result.outcome === 'blocked') throw new InvalidCredentials('invalid_credentials');
    if (result.outcome === 'refused') {
      await this.users.recordFailure(user.id, result.failedAttempts, result.lockedUntil);
      throw new InvalidCredentials('invalid_credentials');
    }
    await this.users.recordSuccess(user.id);
    return { token: await this.sessions.create(user.id), user };
  }
}
