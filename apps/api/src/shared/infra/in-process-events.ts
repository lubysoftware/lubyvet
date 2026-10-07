import { Injectable } from '@nestjs/common';
import type { DomainEvent, DomainEvents } from '../domain/events';
import { logger } from './logger';

export type EventHandler = (event: DomainEvent) => void;

/**
 * 011/T010: barramento em processo. Entrega cada evento aos assinantes no mesmo request, em ordem.
 * A falha de um assinante vai para o log e nunca derruba a gravação que já aconteceu. Evento que
 * precise sair do processo usa a caixa de saída de D12, não este barramento.
 */
@Injectable()
export class InProcessEvents implements DomainEvents {
  private readonly handlers: EventHandler[] = [];

  subscribe(handler: EventHandler): void {
    this.handlers.push(handler);
  }

  publish(event: DomainEvent): void {
    for (const handle of this.handlers) {
      try {
        handle(event);
      } catch (e) {
        logger.error(
          { event: event.type, err: e instanceof Error ? e.name : 'unknown' },
          'assinante de evento',
        );
      }
    }
  }
}
