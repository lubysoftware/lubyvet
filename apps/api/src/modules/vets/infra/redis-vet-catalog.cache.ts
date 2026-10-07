import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import type { CatalogPage, VetCatalogCache } from '../application/ports/vet-catalog.port';

/** P-08: TTL de segurança de 10 minutos; a invalidação troca a geração, sem varrer chaves. */
export const CATALOG_TTL_SECONDS = 600;
const PREFIX = 'lubyvet:vets:catalog';

/**
 * Cache compartilhado entre réplicas (D20). Se o Redis estiver fora, o catálogo lê direto do banco:
 * indisponibilidade do cache nunca derruba a página.
 */
@Injectable()
export class RedisVetCatalogCache implements VetCatalogCache, OnModuleDestroy {
  private readonly redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6380', {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });

  private async safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      return await fn();
    } catch {
      return fallback;
    }
  }

  private async generation(): Promise<string> {
    return (await this.redis.get(`${PREFIX}:gen`)) ?? '0';
  }

  get(page: number, pageSize: number): Promise<CatalogPage | null> {
    return this.safe(async () => {
      const raw = await this.redis.get(`${PREFIX}:${await this.generation()}:${page}:${pageSize}`);
      return raw ? (JSON.parse(raw) as CatalogPage) : null;
    }, null);
  }

  set(value: CatalogPage): Promise<void> {
    return this.safe(async () => {
      await this.redis.set(
        `${PREFIX}:${await this.generation()}:${value.page}:${value.pageSize}`,
        JSON.stringify(value),
        'EX',
        CATALOG_TTL_SECONDS,
      );
    }, undefined);
  }

  invalidate(): Promise<void> {
    return this.safe(async () => {
      await this.redis.incr(`${PREFIX}:gen`);
    }, undefined);
  }

  async onModuleDestroy(): Promise<void> {
    this.redis.disconnect();
  }
}
