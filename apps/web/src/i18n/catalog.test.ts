import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ERROR_CODES, FIELD_ERROR_CODES } from '@lubyvet/contracts';
import { DEFAULT_LOCALE, LOCALES, localeFromUrl, resolveLocale } from './config';
import en from './messages/en.json';
import pt from './messages/pt-BR.json';

const flat = (o: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? flat(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sourceFiles(p) : [p];
  });
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
  it('006/CA-4.1 pt-BR e en têm exatamente as mesmas chaves', () => {
    expect(flat(en).sort()).toEqual(flat(pt).sort());
  });

  it('006/CA-2.1 todo código de erro do contrato tem tradução nos dois idiomas, e não sobra tradução sem código', () => {
    expect(Object.keys(pt.errors).sort()).toEqual([...ERROR_CODES].sort());
    expect(Object.keys(pt.fields).sort()).toEqual([...FIELD_ERROR_CODES].sort());
  });

  it('006/CA-4.2 toda chave de tela é usada pelo código (nenhuma chave fóssil)', () => {
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
  it('006/CA-1.2 usa o cookie quando é um idioma suportado e cai no padrão pt-BR no resto (P-01)', () => {
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('fr')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined)).toBe('pt-BR');
    expect(LOCALES).toEqual(['pt-BR', 'en']);
  });
});

describe('idioma pelo endereço (006/CA-3.2)', () => {
  it('006/CA-3.2 ?lang= resolve pelo mesmo ponto do seletor e o endereço volta limpo', () => {
    const r = localeFromUrl(new URL('http://x/owners?lastName=Li&lang=en'));
    expect(r?.locale).toBe('en');
    expect(r?.cleanUrl.toString()).toBe('http://x/owners?lastName=Li');
    expect(localeFromUrl(new URL('http://x/owners?lang=fr'))?.locale).toBe(DEFAULT_LOCALE);
    expect(localeFromUrl(new URL('http://x/owners'))).toBeNull();
  });
});

/** Texto entre tags no JSX: sem chaves e com letra. A marca tipográfica provisória (D41) é a exceção. */
const ALLOWED_LITERALS = new Set(['Luby', 'Vet']);
export function hardcodedTexts(tsx: string): string[] {
  return [...tsx.matchAll(/(?<![=-])>([^<>{}]*[A-Za-zÀ-ú][^<>{}]*)</g)]
    .map((m) => (m[1] ?? '').trim())
    .filter((s) => s && !ALLOWED_LITERALS.has(s) && !/^[\w.]+\s*=>/.test(s) && !/[;=()]/.test(s));
}

describe('texto fixo na interface (006/US-2)', () => {
  it('006/CA-2.3 a verificação acusa texto fixo introduzido no JSX', () => {
    expect(hardcodedTexts('<p>{t("x")}</p><span className="a">Salvar</span>')).toEqual(['Salvar']);
    expect(hardcodedTexts('<p>Luby<span>Vet</span></p>')).toEqual([]);
    expect(hardcodedTexts('const f = () => apiSend<Out>(x);')).toEqual([]);
  });

  it('006/CA-2.2 nenhum componente tem rótulo ou mensagem fixa: tudo vem do catálogo', () => {
    const files = sourceFiles(join(__dirname, '..')).filter((f) => f.endsWith('.tsx') && !/\.test\./.test(f));
    const found = files.flatMap((f) => hardcodedTexts(readFileSync(f, 'utf8')).map((s) => `${f}: ${s}`));
    expect(found).toEqual([]);
  });
});
