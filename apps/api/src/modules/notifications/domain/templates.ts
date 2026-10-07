/**
 * 004/T027, D28: os dois templates aprovados na Meta (utility, pt_BR), sem botões. A ordem das
 * variáveis é diferente entre os dois, e é isso que esta função fixa.
 */
export type MessageKind = 'confirmation' | 'reminder';

export interface MessageFacts {
  ownerFirstName: string;
  petName: string;
  /** Data e hora do agendamento. */
  scheduledAt: Date;
  clinicName: string;
  clinicPhone: string;
}

export const TEMPLATE_NAMES: Record<MessageKind, string> = {
  confirmation: 'lubyvet_confirmacao',
  reminder: 'lubyvet_lembrete',
};

const TZ = 'America/Sao_Paulo';
const ddmm = (d: Date): string =>
  d.toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' });
const hhmm = (d: Date): string =>
  d.toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

/** Variáveis {{1}} a {{6}} na ordem de cada template (D28). */
export function templateVariables(kind: MessageKind, f: MessageFacts): string[] {
  return kind === 'confirmation'
    ? [f.ownerFirstName, f.petName, ddmm(f.scheduledAt), hhmm(f.scheduledAt), f.clinicName, f.clinicPhone]
    : [f.ownerFirstName, ddmm(f.scheduledAt), hhmm(f.scheduledAt), f.petName, f.clinicName, f.clinicPhone];
}

/** Texto final, para o adaptador falso registrar e para os testes conferirem. */
export function renderMessage(kind: MessageKind, f: MessageFacts): string {
  const v = templateVariables(kind, f);
  return kind === 'confirmation'
    ? `Olá, ${v[0]}! A consulta de ${v[1]} está agendada para ${v[2]} às ${v[3]} na ${v[4]}. Para remarcar, fale com a clínica pelo ${v[5]}.`
    : `Olá, ${v[0]}! Lembrete: amanhã, ${v[1]}, às ${v[2]}, ${v[3]} tem consulta na ${v[4]}. Para remarcar, fale com a clínica pelo ${v[5]}.`;
}
