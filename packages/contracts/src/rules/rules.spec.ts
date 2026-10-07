import { isBrazilianMobile, isValidCpf, isValidEmail, normalizeBrazilianMobile, normalizeCpf } from '.';

describe('regra de celular (D05)', () => {
  it('UT-002-1: aceita celular brasileiro com ou sem máscara e devolve E.164', () => {
    expect(normalizeBrazilianMobile('(11) 98765-4321')).toBe('+5511987654321');
    expect(normalizeBrazilianMobile('11987654321')).toBe('+5511987654321');
    expect(normalizeBrazilianMobile('+55 11 98765-4321')).toBe('+5511987654321');
  });

  it('UT-002-2: recusa o padrão norte-americano de dez dígitos do legado', () => {
    expect(isBrazilianMobile('1234567890')).toBe(false);
  });

  it('UT-002-3: recusa telefone fixo e DDD inexistente', () => {
    expect(isBrazilianMobile('(11) 3456-7890')).toBe(false);
    expect(isBrazilianMobile('(20) 98765-4321')).toBe(false);
  });
});

describe('regra de CPF (D13)', () => {
  it('aceita CPF com dígitos verificadores corretos, com ou sem máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(normalizeCpf('529.982.247-25')).toBe('52998224725');
  });

  it('recusa dígito verificador errado, tamanho errado e sequência repetida', () => {
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('1234')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });
});

describe('regra de e-mail (D13)', () => {
  it('aceita formato válido e recusa o resto; o tamanho é regra separada', () => {
    expect(isValidEmail('mariana@exemplo.com.br')).toBe(true);
    expect(isValidEmail('sem-arroba')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
  });
});
