import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CLOCK, type Clock } from '../../shared/domain/clock';
import { Login } from './application/login.use-case';
import { Sessions } from './application/sessions.use-cases';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
  SESSION_STORE,
  type SessionStore,
  USER_STORE,
  type UserStore,
} from './application/ports/identity.port';
import { Argon2Hasher, PrismaUserStore, RedisSessionStore } from './infra/identity.adapters';
import { AuthGuard } from './interface/http/auth.guard';
import { SessionController } from './interface/http/session.controller';

@Global()
@Module({
  controllers: [SessionController],
  providers: [
    { provide: USER_STORE, useClass: PrismaUserStore },
    { provide: SESSION_STORE, useClass: RedisSessionStore },
    { provide: PASSWORD_HASHER, useClass: Argon2Hasher },
    {
      provide: Login,
      useFactory: (u: UserStore, s: SessionStore, h: PasswordHasher, c: Clock) => new Login(u, s, h, c),
      inject: [USER_STORE, SESSION_STORE, PASSWORD_HASHER, CLOCK],
    },
    {
      provide: Sessions,
      useFactory: (s: SessionStore, u: UserStore) => new Sessions(s, u),
      inject: [SESSION_STORE, USER_STORE],
    },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [USER_STORE],
})
export class IdentityModule {}
