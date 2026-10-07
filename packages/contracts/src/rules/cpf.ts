/** CPF: só dígitos, com os dois dígitos verificadores corretos (D13). Função pura, sem dependência. */
export function normalizeCpf(input: string): string {
  return input.replace(/\D/g, '');
}

export function isValidCpf(input: string): boolean {
  const cpf = normalizeCpf(input);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (len: number): number => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}
