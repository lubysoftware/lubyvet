/**
 * 008/T021, D27: os indicadores de uso, contados a partir dos eventos de domínio e nunca por
 * varredura de log. Os rótulos são fechados: nenhum carrega nome, CPF, celular ou e-mail (P-16).
 */
export type MetricName =
  | 'appointments_created'
  | 'appointments_cancelled'
  | 'appointments_no_show'
  | 'encounters_recorded'
  | 'returns_suggested'
  | 'owners_created'
  | 'pets_created'
  | 'similar_owner_shown'
  | 'similar_owner_dismissed'
  | 'owners_anonymized'
  | 'whatsapp_enqueued'
  | 'whatsapp_sent'
  | 'whatsapp_failed'
  | 'whatsapp_skipped_no_consent';

/** Rótulos permitidos: o id do veterinário (nunca o nome) e o tipo de mensagem. */
export interface MetricLabels {
  vet_id?: string;
  type?: 'confirmation' | 'reminder';
}

export interface Metrics {
  increment(name: MetricName, labels?: MetricLabels): void;
}
export const METRICS = Symbol('Metrics');

/** Sem exportador configurado (testes de unidade, comandos), contar não faz nada. */
export const NO_METRICS: Metrics = { increment: () => undefined };
