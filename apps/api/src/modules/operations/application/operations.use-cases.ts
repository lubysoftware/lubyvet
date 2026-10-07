import type { OpsReader } from './ports/ops.port';

/** 008: prontidão e indicadores agregados (D27, sem dado pessoal), pelos quais as sondas e a gestão passam. */
export class Operations {
  constructor(private readonly ops: OpsReader) {}

  ready(): Promise<boolean> {
    return this.ops.databaseUp();
  }

  indicators(): ReturnType<OpsReader['metrics']> {
    return this.ops.metrics();
  }
}
