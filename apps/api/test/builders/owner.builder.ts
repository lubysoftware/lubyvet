import type { RegisterOwnerInput } from '@lubyvet/contracts';

let seq = 0;

/** CPF sintético com dígitos verificadores válidos (nunca dado real). */
export function validCpf(seed = ++seq): string {
  const base = String(100000000 + ((seed * 7919) % 899999999)).slice(0, 9);
  const dv = (digits: string, weightStart: number): number => {
    const sum = [...digits].reduce((acc, d, i) => acc + Number(d) * (weightStart - i), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const d1 = dv(base, 10);
  const d2 = dv(base + d1, 11);
  return `${base}${d1}${d2}`;
}

/** Celular sintético válido pela regra de D05. */
export function validMobile(seed = ++seq): string {
  return `(11) 9${String(10000000 + ((seed * 104729) % 89999999)).slice(0, 8)}`;
}

export function anOwnerInput(over: Partial<RegisterOwnerInput> = {}): RegisterOwnerInput {
  const n = ++seq;
  return {
    firstName: 'Mariana',
    lastName: `Teixeira${n}`.slice(0, 30),
    address: 'Rua Cardeal Arcoverde, 1749',
    city: 'São Paulo',
    telephone: validMobile(n),
    cpf: validCpf(n),
    messagingConsent: false,
    confirmSimilar: false,
    ...over,
  };
}
