import { Controller, Get, HttpCode, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Operations } from '../../application/operations.use-cases';

/** 008/T008, D03: sondas abertas, só com o estado agregado. */
@Controller('health')
export class HealthController {
  constructor(private readonly ops: Operations) {}

  @Get('live')
  @HttpCode(200)
  live(): { status: 'up' } {
    return { status: 'up' };
  }

  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response): Promise<{ status: 'up' | 'down' }> {
    if (await this.ops.ready()) return { status: 'up' };
    res.status(503);
    return { status: 'down' };
  }
}
