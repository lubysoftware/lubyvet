import { ChangeOwnerContactInput, RegisterOwnerInput } from './owner.schema';

const issues = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  r.success ? [] : (r.error?.issues ?? []).map((i) => ({ path: i.path.join('.'), code: i.message }));

// 001/T009: tabela da Pergunta 22, alteração parcial com semântica declarada.
describe('ChangeOwnerContactInput', () => {
  it('campo ausente significa não alterar', () => {
    const r = ChangeOwnerContactInput.parse({ version: 3 });
    expect(r).toEqual({ version: 3, confirmSimilar: false });
    expect('city' in r).toBe(false);
  });

  it('campo presente com valor significa alterar', () => {
    expect(ChangeOwnerContactInput.parse({ version: 3, city: ' Campinas ' }).city).toBe('Campinas');
  });

  it('campo presente e vazio significa limpar, e a obrigatoriedade reprova', () => {
    expect(issues(ChangeOwnerContactInput.safeParse({ version: 3, city: '' }))).toEqual([
      { path: 'city', code: 'required' },
    ]);
  });

  it('e-mail vazio limpa o e-mail, que é opcional', () => {
    expect(ChangeOwnerContactInput.parse({ version: 3, email: '' }).email).toBe('');
  });

  it('exige a versão lida, para a concorrência otimista (US-5)', () => {
    expect(issues(ChangeOwnerContactInput.safeParse({ city: 'X' }))).toEqual([
      { path: 'version', code: 'required' },
    ]);
  });
});

describe('RegisterOwnerInput', () => {
  it('usa os mesmos limites de tamanho do banco (P3)', () => {
    const base = {
      firstName: 'a'.repeat(31),
      lastName: 'B',
      address: 'C',
      city: 'D',
      telephone: '(11) 98765-4321',
      cpf: '529.982.247-25',
    };
    expect(issues(RegisterOwnerInput.safeParse(base))).toEqual([{ path: 'firstName', code: 'too_long' }]);
  });
});
