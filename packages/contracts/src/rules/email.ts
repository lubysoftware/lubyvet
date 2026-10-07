export const EMAIL_MAX = 254;

/** Formato de e-mail suficiente para cadastro (D13); a entrega real não é verificada. */
export function isValidEmail(input: string): boolean {
  return input.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}
