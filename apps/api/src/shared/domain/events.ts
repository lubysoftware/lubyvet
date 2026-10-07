/**
 * 011/T010, D27: os fatos de domínio que viram indicador. Só identificadores e tipos, nunca dado
 * pessoal (P-16). Quem publica não sabe quem escuta; o assinante de métricas é um entre outros.
 */
export type DomainEvent =
  | { type: 'owner_registered'; ownerId: number }
  | { type: 'similar_owner_warned' }
  | { type: 'similar_owner_dismissed' }
  | { type: 'owner_anonymized'; ownerId: number }
  | { type: 'pet_registered'; petId: number }
  | { type: 'appointment_scheduled'; appointmentId: number }
  | { type: 'appointment_cancelled'; appointmentId: number }
  | { type: 'appointment_no_show'; appointmentId: number }
  | { type: 'encounter_recorded'; encounterId: number; vetId: number | null; returnSuggested: boolean }
  | { type: 'whatsapp_enqueued'; outboxId: number }
  | { type: 'whatsapp_sent'; outboxId: number; kind: 'confirmation' | 'reminder' }
  | { type: 'whatsapp_skipped_no_consent'; outboxId: number; kind: 'confirmation' | 'reminder' }
  | { type: 'whatsapp_failed'; outboxId: number };

export type DomainEventType = DomainEvent['type'];

export interface DomainEvents {
  publish(event: DomainEvent): void;
}
export const DOMAIN_EVENTS = Symbol('DomainEvents');

/** Sem barramento (testes de unidade, comandos): publicar não faz nada. */
export const NO_EVENTS: DomainEvents = { publish: () => undefined };
