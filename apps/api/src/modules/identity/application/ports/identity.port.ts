import type { Role } from '@lubyvet/contracts';

export interface UserRecord {
  id: number;
  name: string;
  role: Role;
  status: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil: Date | null;
}
export interface UserStore {
  byLogin(login: string): Promise<UserRecord | null>;
  byId(id: number): Promise<UserRecord | null>;
  recordFailure(id: number, attempts: number, lockedUntil: Date | null): Promise<void>;
  recordSuccess(id: number): Promise<void>;
}
export const USER_STORE = Symbol('UserStore');

/** D19: sessão com expiração deslizante por inatividade. */
export interface SessionStore {
  create(userId: number): Promise<string>;
  /** Devolve o usuário e renova o prazo; null quando expirou ou não existe. */
  touch(token: string): Promise<number | null>;
  destroy(token: string): Promise<void>;
}
export const SESSION_STORE = Symbol('SessionStore');

export interface PasswordHasher {
  verify(hash: string, password: string): Promise<boolean>;
}
export const PASSWORD_HASHER = Symbol('PasswordHasher');
