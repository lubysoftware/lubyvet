import { randomBytes } from 'node:crypto';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { Role } from '@lubyvet/contracts';
import argon2 from 'argon2';
import Redis from 'ioredis';
import { PrismaService } from '../../../shared/infra/prisma.service';
import type { PasswordHasher, SessionStore, UserRecord, UserStore } from '../application/ports/identity.port';

@Injectable()
export class PrismaUserStore implements UserStore {
  constructor(private readonly db: PrismaService) {}
  private map(
    r: {
      id: number;
      name: string;
      role: string;
      status: string;
      passwordHash: string;
      failedAttempts: number;
      lockedUntil: Date | null;
    } | null,
  ): UserRecord | null {
    return r
      ? {
          id: r.id,
          name: r.name,
          role: r.role as Role,
          status: r.status,
          passwordHash: r.passwordHash,
          failedAttempts: r.failedAttempts,
          lockedUntil: r.lockedUntil,
        }
      : null;
  }
  async byLogin(login: string): Promise<UserRecord | null> {
    return this.map(await this.db.user.findUnique({ where: { login } }));
  }
  async byId(id: number): Promise<UserRecord | null> {
    return this.map(await this.db.user.findUnique({ where: { id } }));
  }
  async recordFailure(id: number, attempts: number, lockedUntil: Date | null): Promise<void> {
    await this.db.user.update({
      where: { id },
      data: { failedAttempts: lockedUntil ? 0 : attempts, lockedUntil },
    });
  }
  async recordSuccess(id: number): Promise<void> {
    await this.db.user.update({ where: { id }, data: { failedAttempts: 0, lockedUntil: null } });
  }
}

/** D19: idle de 8 horas por padrão (SESSION_IDLE_HOURS), renovado a cada requisição (T008). */
export const idleSeconds = (): number => Math.round(Number(process.env.SESSION_IDLE_HOURS ?? 8) * 3600);

@Injectable()
export class RedisSessionStore implements SessionStore, OnModuleDestroy {
  private readonly redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6380', {
    lazyConnect: true,
  });
  private async r(): Promise<Redis> {
    if (this.redis.status === 'wait') await this.redis.connect();
    return this.redis;
  }
  async create(userId: number): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await (await this.r()).set(`lubyvet:session:${token}`, String(userId), 'EX', idleSeconds());
    return token;
  }
  async touch(token: string): Promise<number | null> {
    const r = await this.r();
    const userId = await r.getex(`lubyvet:session:${token}`, 'EX', idleSeconds());
    return userId ? Number(userId) : null;
  }
  async destroy(token: string): Promise<void> {
    await (await this.r()).del(`lubyvet:session:${token}`);
  }
  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}

@Injectable()
export class Argon2Hasher implements PasswordHasher {
  verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password).catch(() => false);
  }
}
