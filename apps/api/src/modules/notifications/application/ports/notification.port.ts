import type { MessageFacts, MessageKind } from '../../domain/templates';

/** D12: porta de envio ao dono; o adaptador padrão é o falso, que registra em log (D28). */
export interface OwnerNotifier {
  send(to: string, kind: MessageKind, facts: MessageFacts): Promise<void>;
}
export const OWNER_NOTIFIER = Symbol('OwnerNotifier');

export interface OutboxDelivery {
  kind: MessageKind;
  to: string;
  consent: boolean;
  facts: MessageFacts;
}

export interface OutboxRepository {
  pending(limit: number): Promise<number[]>;
  markPublished(id: number): Promise<void>;
  delivery(id: number): Promise<OutboxDelivery | null>;
  mark(id: number, status: 'sent' | 'skipped' | 'failed'): Promise<void>;
  /** D12/T024: um lembrete por agendamento de amanhã ainda Agendado; idempotente. */
  enqueueReminders(tomorrow: string): Promise<number>;
}
export const OUTBOX = Symbol('Outbox');

export interface MessageQueue {
  publish(outboxId: number): Promise<void>;
}
export const MESSAGE_QUEUE = Symbol('MessageQueue');
