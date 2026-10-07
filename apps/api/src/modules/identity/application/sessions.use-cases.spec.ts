import type { SessionStore, UserRecord, UserStore } from './ports/identity.port';
import { Sessions } from './sessions.use-cases';

const user = (over: Partial<UserRecord> = {}): UserRecord => ({
  id: 2,
  name: 'Carla',
  role: 'writer',
  status: 'active',
  passwordHash: 'x',
  failedAttempts: 0,
  lockedUntil: null,
  ...over,
});
const stores = (u: UserRecord | null, touched: number | null = 2) => {
  const sessions: SessionStore = {
    create: jest.fn(),
    touch: jest.fn(async () => touched),
    destroy: jest.fn(),
  };
  const users: UserStore = {
    byLogin: jest.fn(),
    byId: jest.fn(async () => u),
    recordFailure: jest.fn(),
    recordSuccess: jest.fn(),
  };
  return { sessions, users };
};

describe('Sessions (011/T006)', () => {
  it('resolve a sessão de um usuário ativo e renova o prazo', async () => {
    const s = stores(user());
    await expect(new Sessions(s.sessions, s.users).resolve('tok')).resolves.toEqual({
      userId: 2,
      name: 'Carla',
      role: 'writer',
    });
    expect(s.sessions.touch).toHaveBeenCalledWith('tok');
  });

  it('sem token, sessão vencida ou usuário inativo não há sessão', async () => {
    expect(await new Sessions(stores(user()).sessions, stores(user()).users).resolve(undefined)).toBeNull();
    const expired = stores(user(), null);
    expect(await new Sessions(expired.sessions, expired.users).resolve('tok')).toBeNull();
    const inactive = stores(user({ status: 'inactive' }));
    expect(await new Sessions(inactive.sessions, inactive.users).resolve('tok')).toBeNull();
  });

  it('descreve o usuário e encerra a sessão', async () => {
    const s = stores(user());
    const sessions = new Sessions(s.sessions, s.users);
    await expect(sessions.describe(2)).resolves.toEqual({ name: 'Carla' });
    await sessions.close('tok');
    await sessions.close(undefined);
    expect(s.sessions.destroy).toHaveBeenCalledTimes(1);
  });
});
