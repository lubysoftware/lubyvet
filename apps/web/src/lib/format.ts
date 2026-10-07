import { BUSINESS_TZ } from '@lubyvet/contracts';

/** Máscaras de exibição do design system (README, Conteúdo). O valor gravado não muda. */
export function formatPhone(e164: string): string {
  const d = e164.replace(/\D/g, '').replace(/^55(?=\d{11}$)/, '');
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : e164;
}

export function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '');
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf;
}

/** Data pura (YYYY-MM-DD) lida como data do calendário, sem fuso. */
export const dateOnly = (d: string): Date => new Date(`${d.slice(0, 10)}T12:00:00Z`);

/** Valor de um campo datetime-local a partir de um instante, no fuso do navegador. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** O contrato pede o instante com fuso; o campo datetime-local dá a hora local do balcão. */
export const fromLocalInput = (v: string | undefined): string | undefined =>
  v ? new Date(v).toISOString() : v;

/** Valor de datetime-local no fuso do negócio, para o servidor preparar o formulário. */
export const toBusinessInput = (d: Date): string =>
  d.toLocaleString('sv-SE', { timeZone: BUSINESS_TZ }).replace(' ', 'T').slice(0, 16);
