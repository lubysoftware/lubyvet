import { Controller, Get, HttpCode, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { OPS_READER, type OpsReader } from '../../application/ports/ops.port';

/** 008/T008, D03: sondas abertas, só com o estado agregado. */
@Controller('health')
export class HealthController {
  constructor(@Inject(OPS_READER) private readonly ops: OpsReader) {}

  @Get('live')
  @HttpCode(200)
  live(): { status: 'up' } {
    return { status: 'up' };
  }

  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response): Promise<{ status: 'up' | 'down' }> {
    if (await this.ops.databaseUp()) return { status: 'up' };
    res.status(503);
    return { status: 'down' };
  }
}
