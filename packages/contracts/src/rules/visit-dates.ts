/**
 * 004/T006: a faixa de datas das visitas, a mesma que o domínio da API aplica. Daqui saem a data
 * sugerida e o limite declarado nos campos do formulário; o teste de aceitação da 004 compara
 * esta regra com a do domínio, para que mudar uma e esquecer a outra quebre o build.
 * Agendamento: estritamente no futuro. Atendimento: hoje ou qualquer data passada (D06).
 */
export const BUSINESS_TZ = 'America/Sao_Paulo';
const DAY_MS = 24 * 60 * 60 * 1000;

export const businessToday = (now: Date): string =>
  now.toLocaleDateString('sv-SE', { timeZone: BUSINESS_TZ });

export const appointmentAllowed = (scheduledAt: Date, now: Date): boolean =>
  scheduledAt.getTime() > now.getTime();
export const encounterDateAllowed = (date: string, now: Date): boolean => date <= businessToday(now);
/** D26: a data de retorno é futura. */
export const returnDateAllowed = (date: string, now: Date): boolean => date > businessToday(now);

/** A data sugerida do agendamento é o dia seguinte ao do relógio, na mesma hora. */
export const suggestedAppointment = (now: Date): Date => new Date(now.getTime() + DAY_MS);
/** O primeiro dia aceito como retorno. */
export const firstReturnDate = (now: Date): string => businessToday(new Date(now.getTime() + DAY_MS));
