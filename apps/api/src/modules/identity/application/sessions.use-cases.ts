import type { Role } from '@lubyvet/contracts';
import type { SessionStore, UserStore } from './ports/identity.port';

export interface SessionUser {
  userId: number;
  name: string;
  role: Role;
}

/**
 * 007, D19: a sessão aberta pelo login. Resolver renova o prazo por inatividade e só reconhece
 * usuário ativo; encerrar apaga a sessão. O guard e o controller chamam isto, nunca as portas.
 */
export class Sessions {
  constructor(
    private readonly sessions: SessionStore,
    private readonly users: UserStore,
  ) {}

  async resolve(token: string | undefined): Promise<SessionUser | null> {
    const userId = token ? await this.sessions.touch(token) : null;
    const user = userId ? await this.users.byId(userId) : null;
    if (!user || user.status !== 'active') return null;
    return { userId: user.id, name: user.name, role: user.role };
  }

  async describe(userId: number): Promise<{ name: string }> {
    return { name: (await this.users.byId(userId))?.name ?? '' };
  }

  async close(token: string | undefined): Promise<void> {
    if (token) await this.sessions.destroy(token);
  }
}
