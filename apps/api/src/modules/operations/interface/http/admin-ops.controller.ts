import { Controller, Get, Inject } from '@nestjs/common';
import { OPS_READER, type OpsReader } from '../../application/ports/ops.port';

/** 008/T018, D03: gestão só para Administrador. T021, D27: indicadores sem dado pessoal. */
@Controller('admin')
export class AdminOpsController {
  constructor(@Inject(OPS_READER) private readonly ops: OpsReader) {}

  @Get('info')
  info(): { service: string; node: string } {
    return { service: 'lubyvet-api', node: process.version };
  }

  @Get('metrics')
  metrics(): Promise<Record<string, number | Record<string, number>>> {
    return this.ops.metrics();
  }
}
