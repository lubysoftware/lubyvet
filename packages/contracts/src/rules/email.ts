export const EMAIL_MAX = 254;

/** Formato de e-mail suficiente para cadastro (D13). O tamanho é regra à parte (EMAIL_MAX). */
export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}
