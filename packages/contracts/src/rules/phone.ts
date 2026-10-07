/**
 * Regra única de telefone do dono (D05): celular brasileiro, DDD válido mais nove dígitos
 * começando por 9. Aceita máscara e o prefixo +55; devolve o valor em E.164 ou null.
 */
const VALID_DDD = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46,
  47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85,
  86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export function normalizeBrazilianMobile(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length !== 11) return null;
  if (!VALID_DDD.has(Number(digits.slice(0, 2)))) return null;
  if (digits[2] !== '9') return null;
  return `+55${digits}`;
}

export function isBrazilianMobile(input: string): boolean {
  return normalizeBrazilianMobile(input) !== null;
}
