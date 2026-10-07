import { Account, LOCK_MINUTES, MAX_ATTEMPTS } from './account';

const now = new Date('2026-10-07T12:00:00Z');
const later = (min: number) => new Date(now.getTime() + min * 60_000);
const account = (over: Partial<{ status: string; failedAttempts: number; lockedUntil: Date | null }> = {}) =>
  Account.restore({ id: 1, status: 'active', failedAttempts: 0, lockedUntil: null, ...over });

describe('Account: bloqueio por tentativas (P-15, 011/T007)', () => {
  it('senha certa aceita e zera as tentativas', () => {
    expect(account({ failedAttempts: 3 }).attempt(true, now)).toEqual({
      outcome: 'accepted',
      failedAttempts: 0,
      lockedUntil: null,
    });
  });

  it('da primeira à quarta senha errada soma, sem bloquear', () => {
    for (let n = 0; n < MAX_ATTEMPTS - 1; n++)
      expect(account({ failedAttempts: n }).attempt(false, now)).toEqual({
        outcome: 'refused',
        failedAttempts: n + 1,
        lockedUntil: null,
      });
  });

  it('a quinta senha errada bloqueia por quinze minutos', () => {
    expect(account({ failedAttempts: 4 }).attempt(false, now)).toEqual({
      outcome: 'refused',
      failedAttempts: 5,
      lockedUntil: later(LOCK_MINUTES),
    });
  });

  it('a sexta tentativa, mesmo com a senha certa, é bloqueada enquanto dura o bloqueio', () => {
    const locked = account({ failedAttempts: 5, lockedUntil: later(LOCK_MINUTES) });
    expect(locked.attempt(true, later(1))).toEqual({ outcome: 'blocked' });
    expect(locked.canTry(later(LOCK_MINUTES - 1))).toBe(false);
  });

  it('o bloqueio acaba sozinho pelo tempo', () => {
    const locked = account({ failedAttempts: 5, lockedUntil: later(LOCK_MINUTES) });
    expect(locked.canTry(later(LOCK_MINUTES))).toBe(true);
    expect(locked.attempt(true, later(LOCK_MINUTES)).outcome).toBe('accepted');
  });

  it('conta inativa não tenta, com qualquer senha', () => {
    expect(account({ status: 'inactive' }).attempt(true, now)).toEqual({ outcome: 'blocked' });
  });
});
