import { Body, Controller, Delete, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { LoginInput, type SessionOutput } from '@lubyvet/contracts';
import type { Request, Response } from 'express';
import type { Actor } from '../../../../shared/interface/http/roles';
import { ZodValidationPipe } from '../../../../shared/interface/http/zod-validation.pipe';
import { Login } from '../../application/login.use-case';
import { Sessions } from '../../application/sessions.use-cases';
import { SESSION_COOKIE } from './auth.guard';

@Controller('session')
export class SessionController {
  constructor(
    private readonly login: Login,
    private readonly sessions: Sessions,
  ) {}

  @Post()
  @HttpCode(200)
  async open(
    @Body(new ZodValidationPipe(LoginInput)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionOutput> {
    const { token, user } = await this.login.execute(body.login, body.password);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      // Em produção o cookie é Secure; COOKIE_SECURE=false só para servir por HTTP (Docker local).
      secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
      path: '/',
    });
    return { userId: user.id, name: user.name, role: user.role };
  }

  @Get()
  async me(@Req() req: Request & { actor: Actor }): Promise<SessionOutput> {
    const { name } = await this.sessions.describe(req.actor.userId);
    return { userId: req.actor.userId, name, role: req.actor.role };
  }

  @Delete()
  @HttpCode(204)
  async close(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    await this.sessions.close(token);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }
}
