/** P-15: cinco senhas erradas bloqueiam o login por quinze minutos. */
export const MAX_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

export interface AccountProps {
  id: number;
  status: string;
  failedAttempts: number;
  lockedUntil: Date | null;
}

/** O resultado de uma tentativa, e o estado que a conta passa a ter. */
export type Attempt =
  | { outcome: 'accepted'; failedAttempts: 0; lockedUntil: null }
  | { outcome: 'refused'; failedAttempts: number; lockedUntil: Date | null }
  | { outcome: 'blocked' };

/**
 * 007/US-1, P-15: a conta de acesso decide a tentativa de login. Conta inativa ou bloqueada não
 * tenta (e a senha nem é conferida). Senha errada soma uma tentativa; na quinta, bloqueia por
 * quinze minutos. O bloqueio acaba sozinho pelo tempo; as tentativas só zeram com um login certo.
 */
export class Account {
  private constructor(private readonly props: AccountProps) {}

  static restore(props: AccountProps): Account {
    return new Account({ ...props });
  }

  canTry(now: Date): boolean {
    if (this.props.status !== 'active') return false;
    return !(this.props.lockedUntil && this.props.lockedUntil > now);
  }

  attempt(passwordOk: boolean, now: Date): Attempt {
    if (!this.canTry(now)) return { outcome: 'blocked' };
    if (passwordOk) return { outcome: 'accepted', failedAttempts: 0, lockedUntil: null };
    const failedAttempts = this.props.failedAttempts + 1;
    const lockedUntil =
      failedAttempts >= MAX_ATTEMPTS ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : null;
    return { outcome: 'refused', failedAttempts, lockedUntil };
  }
}
