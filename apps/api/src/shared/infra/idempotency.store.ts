import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from './prisma.service';

export interface StoredResponse {
  status: number;
  body: unknown;
}

const RETENTION_HOURS = 24;

/** P-25: reserva a chave antes de executar, guarda o resultado da primeira execução por 24 horas. */
@Injectable()
export class IdempotencyStore {
  constructor(private readonly db: PrismaService) {}

  /** true se esta requisição reservou a chave agora. */
  async claim(key: string, method: string, path: string): Promise<boolean> {
    await this.db
      .$executeRaw`delete from idempotency_keys where created_at < now() - make_interval(hours => ${RETENTION_HOURS})`;
    const inserted = await this.db
      .$executeRaw`insert into idempotency_keys (key, method, path) values (${key}, ${method}, ${path}) on conflict (key) do nothing`;
    return inserted === 1;
  }

  async result(key: string): Promise<StoredResponse | null | undefined> {
    const row = await this.db.idempotencyKey.findUnique({ where: { key } });
    if (!row) return undefined;
    if (row.status === null) return null;
    return { status: row.status, body: row.body };
  }

  async complete(key: string, status: number, body: unknown): Promise<void> {
    await this.db.idempotencyKey.update({
      where: { key },
      data: { status, body: (body ?? Prisma.JsonNull) as Prisma.InputJsonValue },
    });
  }

  /** Falhou: libera a chave para o mesmo formulário corrigido poder gravar. */
  async release(key: string): Promise<void> {
    await this.db.idempotencyKey.deleteMany({ where: { key, status: null } });
  }
}
