import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ERROR_CODES, FIELD_ERROR_CODES } from '@lubyvet/contracts';
import { DEFAULT_LOCALE, LOCALES, resolveLocale } from './config';
import en from './messages/en.json';
import pt from './messages/pt-BR.json';

const flat = (o: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? flat(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
const source = (dir: string): string =>
  readdirSync(dir)
    .map((f) => join(dir, f))
    .map((p) =>
      statSync(p).isDirectory()
        ? source(p)
        : /\.tsx?$/.test(p) && !/\.test\./.test(p)
          ? readFileSync(p, 'utf8')
          : '',
    )
    .join('\n');

// 006/T004, P7: a verificação de catálogo falha nos DOIS sentidos.
describe('catálogos de tradução', () => {
  it('pt-BR e en têm exatamente as mesmas chaves', () => {
    expect(flat(en).sort()).toEqual(flat(pt).sort());
  });

  it('todo código de erro do contrato tem tradução, e não sobra tradução sem código', () => {
    expect(Object.keys(pt.errors).sort()).toEqual([...ERROR_CODES].sort());
    expect(Object.keys(pt.fields).sort()).toEqual([...FIELD_ERROR_CODES].sort());
  });

  it('toda chave de tela é usada pelo código (nenhuma chave fóssil)', () => {
    const code = source(join(__dirname, '..'));
    const unused = flat(pt)
      .filter((k) => !k.startsWith('errors.') && !k.startsWith('fields.'))
      .filter((k) => {
        const [ns, ...rest] = k.split('.');
        const key = rest.join('.');
        return !code.includes(`'${k}'`) && !code.includes(`'${key}'`) && !code.includes(`\`${ns}.\${`);
      });
    expect(unused).toEqual([]);
  });
});

// 006/T008: resolução do idioma num único ponto.
describe('resolução do idioma', () => {
  it('usa o cookie quando é um idioma suportado e cai no padrão pt-BR no resto (P-01)', () => {
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('fr')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined)).toBe('pt-BR');
    expect(LOCALES).toEqual(['pt-BR', 'en']);
  });
});
