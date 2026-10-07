/**
 * 004/T006: a faixa de datas aceitável, declarada num único lugar e usada pela validação e pelo
 * formulário (via @lubyvet/contracts e esta política no servidor).
 * Agendamento: estritamente no futuro. Atendimento: hoje ou qualquer data passada (D06).
 */
export const BUSINESS_TZ = 'America/Sao_Paulo';

export const todayIn = (now: Date): string => now.toLocaleDateString('sv-SE', { timeZone: BUSINESS_TZ });

export const isRealDate = (d: string): boolean => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return false;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).toISOString().slice(0, 10) === d;
};

export const appointmentAccepts = (scheduledAt: Date, now: Date): boolean =>
  scheduledAt.getTime() > now.getTime();

export const encounterAccepts = (date: string, now: Date): boolean => date <= todayIn(now);
