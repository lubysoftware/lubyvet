import type { FormEvent } from 'react';

/** Valores do formulário como texto; cada tela converte para o tipo do contrato antes de validar. */
export function formValues(e: FormEvent<HTMLFormElement>): Record<string, string> {
  e.preventDefault();
  const out: Record<string, string> = {};
  for (const [k, v] of new FormData(e.currentTarget).entries()) if (typeof v === 'string') out[k] = v;
  return out;
}

/** Campo opcional vazio é ausência, não texto vazio. */
export const optional = (v: string | undefined): string | undefined =>
  v === undefined || v.trim() === '' ? undefined : v;
export const optionalNumber = (v: string | undefined): number | undefined => {
  const o = optional(v)?.replace(',', '.');
  return o === undefined ? undefined : Number(o);
};
