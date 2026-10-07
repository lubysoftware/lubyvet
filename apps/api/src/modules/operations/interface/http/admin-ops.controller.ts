import { Controller, Get } from '@nestjs/common';
import { Operations } from '../../application/operations.use-cases';

/** 008/T018, D03: gestão só para Administrador. T021, D27: indicadores sem dado pessoal. */
@Controller('admin')
export class AdminOpsController {
  constructor(private readonly ops: Operations) {}

  @Get('info')
  info(): { service: string; node: string } {
    return { service: 'lubyvet-api', node: process.version };
  }

  @Get('metrics')
  metrics(): Promise<Record<string, number | Record<string, number>>> {
    return this.ops.indicators();
  }
}
