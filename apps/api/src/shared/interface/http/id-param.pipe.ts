import { type PipeTransform } from '@nestjs/common';
import type { ErrorCode } from '@lubyvet/contracts';
import { NotFound } from '../../domain/errors';

/** Identificador na URL: inteiro positivo, senão "não encontrado" (P4, REG-48). */
export class IdParamPipe implements PipeTransform<string, number> {
  constructor(private readonly notFound: ErrorCode) {}
  transform(value: string): number {
    if (!/^[1-9]\d{0,9}$/.test(value)) throw new NotFound(this.notFound);
    const id = Number(value);
    if (id > 2147483647) throw new NotFound(this.notFound);
    return id;
  }
}
