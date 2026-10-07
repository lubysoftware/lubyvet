import { FixedClock } from '../../../shared/domain/clock';
import { InvalidCredentials, Login, MAX_ATTEMPTS } from './login.use-case';
import type { PasswordHasher, SessionStore, UserRecord, UserStore } from './ports/identity.port';

const clock = FixedClock.at('2026-10-07T12:00:00-03:00');
const base: UserRecord = {
  id: 1,
  name: 'Ana',
  role: 'admin',
  status: 'active',
  passwordHash: 'h',
  failedAttempts: 0,
  lockedUntil: null,
};
const setup = (user: UserRecord | null) => {
  const log: unknown[] = [];
  const users: UserStore = {
    byLogin: async () => user,
    byId: async () => user,
    recordFailure: async (...a) => void log.push(['fail', ...a]),
    recordSuccess: async (id) => void log.push(['ok', id]),
  };
  const sessions: SessionStore = {
    create: async () => 'tok',
    touch: async () => null,
    destroy: async () => undefined,
  };
  const hasher: PasswordHasher = { verify: async (_h, p) => p === 'certa' };
  return { login: new Login(users, sessions, hasher, clock), log };
};

describe('Login (007/T003, P-15)', () => {
  it('abre a sessão com a senha certa e zera as tentativas', async () => {
    const { login, log } = setup(base);
    expect((await login.execute(' Admin@X ', 'certa')).token).toBe('tok');
    expect(log).toEqual([['ok', 1]]);
  });

  it('recusa de forma genérica: login inexistente, inativo, bloqueado ou senha errada', async () => {
    await expect(setup(null).login.execute('x', 'certa')).rejects.toBeInstanceOf(InvalidCredentials);
    await expect(setup({ ...base, status: 'inactive' }).login.execute('x', 'certa')).rejects.toBeInstanceOf(
      InvalidCredentials,
    );
    await expect(
      setup({ ...base, lockedUntil: new Date('2026-10-07T16:00:00Z') }).login.execute('x', 'certa'),
    ).rejects.toBeInstanceOf(InvalidCredentials);
    const { login, log } = setup(base);
    await expect(login.execute('x', 'errada')).rejects.toBeInstanceOf(InvalidCredentials);
    expect(log).toEqual([['fail', 1, 1, null]]);
  });

  it(`a ${MAX_ATTEMPTS}ª tentativa errada bloqueia por 15 minutos`, async () => {
    const { login, log } = setup({ ...base, failedAttempts: MAX_ATTEMPTS - 1 });
    await expect(login.execute('x', 'errada')).rejects.toBeInstanceOf(InvalidCredentials);
    expect(log).toEqual([['fail', 1, MAX_ATTEMPTS, new Date(clock.now().getTime() + 15 * 60_000)]]);
  });
});
