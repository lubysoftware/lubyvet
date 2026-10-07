import { FieldRuleViolation, StaleVersion } from '../../../shared/domain/errors';
import { Owner, type RegisterOwnerFields } from './owner';

const NOW = new Date('2026-10-07T12:00:00-03:00');
const valid = (over: Partial<RegisterOwnerFields> = {}): RegisterOwnerFields => ({
  firstName: 'Mariana',
  lastName: 'Teixeira',
  address: 'Rua Cardeal Arcoverde, 1749',
  city: 'São Paulo',
  telephone: '(11) 98765-4321',
  cpf: '529.982.247-25',
  messagingConsent: false,
  ...over,
});
const fieldsOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof FieldRuleViolation) return e.fields;
    throw e;
  }
  return [];
};

describe('Owner', () => {
  it('nasce sem identificador, portanto novo (P4)', () => {
    const owner = Owner.register(valid(), NOW);
    expect(owner.isNew()).toBe(true);
    expect(owner.id).toBeUndefined();
  });

  it('grava o celular normalizado em E.164 e o CPF só com dígitos (D05, D13)', () => {
    const s = Owner.register(valid(), NOW).snapshot();
    expect(s.telephone).toBe('+5511987654321');
    expect(s.cpf).toBe('52998224725');
  });

  it.each(['firstName', 'lastName', 'address', 'city', 'telephone', 'cpf'] as const)(
    'UT-001-2: recusa %s em branco, apontando o campo',
    (field) => {
      expect(fieldsOf(() => Owner.register(valid({ [field]: '  ' }), NOW))).toEqual([
        { path: field, code: 'required' },
      ]);
    },
  );

  it.each([
    ['firstName', 30],
    ['lastName', 30],
    ['address', 255],
    ['city', 80],
  ] as const)('UT-001-4: aceita %s com %i caracteres e recusa com um a mais', (field, max) => {
    expect(fieldsOf(() => Owner.register(valid({ [field]: 'a'.repeat(max) }), NOW))).toEqual([]);
    expect(fieldsOf(() => Owner.register(valid({ [field]: 'a'.repeat(max + 1) }), NOW))).toEqual([
      { path: field, code: 'too_long' },
    ]);
  });

  it('recusa celular fora da regra de D05 no próprio campo', () => {
    expect(fieldsOf(() => Owner.register(valid({ telephone: '1234567890' }), NOW))).toEqual([
      { path: 'telephone', code: 'invalid_phone' },
    ]);
  });

  it('recusa CPF com dígito verificador errado e e-mail inválido', () => {
    expect(fieldsOf(() => Owner.register(valid({ cpf: '529.982.247-24', email: 'x' }), NOW))).toEqual([
      { path: 'cpf', code: 'invalid_cpf' },
      { path: 'email', code: 'invalid_email' },
    ]);
  });

  it('registra a data do consentimento de mensagens só quando dado (D12)', () => {
    expect(Owner.register(valid({ messagingConsent: true }), NOW).snapshot().messagingConsentAt).toEqual(NOW);
    expect(Owner.register(valid(), NOW).snapshot().messagingConsentAt).toBeNull();
  });

  describe('changeContact', () => {
    const persisted = () => Owner.restore({ ...Owner.register(valid(), NOW).snapshot(), id: 7, version: 3 });

    it('altera só os campos presentes (Pergunta 22)', () => {
      const owner = persisted();
      owner.changeContact({ city: 'Campinas' }, 3, NOW);
      expect(owner.snapshot()).toMatchObject({ city: 'Campinas', firstName: 'Mariana', id: 7 });
    });

    it('campo presente e vazio limpa, e a obrigatoriedade reprova (CA-4.3)', () => {
      expect(fieldsOf(() => persisted().changeContact({ city: '' }, 3, NOW))).toEqual([
        { path: 'city', code: 'required' },
      ]);
    });

    it('UT-005-2: recusa gravação com versão vencida, entregando os valores atuais', () => {
      const owner = persisted();
      expect(() => owner.changeContact({ city: 'Campinas' }, 2, NOW)).toThrow(StaleVersion);
    });

    it('troca telefone, e-mail e consentimento, mantendo a data do consentimento já dado', () => {
      const owner = persisted();
      owner.changeContact(
        { telephone: '21 99123-0045', email: 'm@exemplo.com', messagingConsent: true },
        3,
        NOW,
      );
      const later = new Date('2026-10-08T12:00:00-03:00');
      owner.changeContact({ messagingConsent: true }, 3, later);
      expect(owner.snapshot()).toMatchObject({
        telephone: '+5521991230045',
        email: 'm@exemplo.com',
        messagingConsentAt: NOW,
      });
      owner.changeContact({ messagingConsent: false, email: '' }, 3, later);
      expect(owner.snapshot()).toMatchObject({ messagingConsentAt: null, email: null });
    });

    it('recusa telefone vazio e e-mail longo na alteração', () => {
      expect(
        fieldsOf(() =>
          persisted().changeContact({ telephone: '', email: `${'a'.repeat(250)}@x.com` }, 3, NOW),
        ),
      ).toEqual([
        { path: 'telephone', code: 'required' },
        { path: 'email', code: 'too_long' },
      ]);
    });

    it('registra a dispensa do aviso de dono parecido (CA-3.2)', () => {
      const owner = persisted();
      owner.dismissSimilarity(NOW);
      expect(owner.snapshot().similarityDismissedAt).toEqual(NOW);
      expect(owner.version).toBe(3);
      expect(owner.telephone).toBe('+5511987654321');
    });
  });
});
