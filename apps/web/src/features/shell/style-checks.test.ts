import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { contrast, failingPairs, tokensOf } from './palette';

const css = readFileSync(join(__dirname, '../../app/globals.css'), 'utf8');
const source = (dir: string): string =>
  readdirSync(dir)
    .map((f) => join(dir, f))
    .map((p) =>
      statSync(p).isDirectory()
        ? source(p)
        : /\.tsx$/.test(p) && !/\.test\./.test(p)
          ? readFileSync(p, 'utf8')
          : '',
    )
    .join('\n');
const tsx = source(join(__dirname, '../..'));

// 010: T005/T010 (paleta AA nos dois temas), T003 (pedido x entregue), T004 (seletor órfão), T006 (pesos), T009.
describe('verificações de estilo', () => {
  it('010/CA-2.1 T010/D07: todo par nomeado passa no WCAG 2.2 AA no tema claro e no escuro', () => {
    expect(failingPairs(tokensOf(css, ':root'))).toEqual([]);
    expect(failingPairs(tokensOf(css, ":root[data-theme='dark']"))).toEqual([]);
  });

  it('D38: o tema "sistema" escuro usa exatamente os tokens do tema escuro explícito', () => {
    expect(tokensOf(css, ":root:not([data-theme='light'])")).toEqual(
      tokensOf(css, ":root[data-theme='dark']"),
    );
  });

  it('010/CA-2.3 T005: a verificação aponta o par reprovado pelo nome', () => {
    expect(failingPairs({ foreground: '#777777', background: '#ffffff' })[0]).toBe(
      'texto (foreground sobre background)',
    );
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  it('010/CA-1.2 T003: toda cor pedida nas classes existe como token entregue no @theme', () => {
    const requested = new Set(
      [...tsx.matchAll(/\b(?:bg|text|border|ring)-([a-z-]+)\b/g)].map((m) => m[1] ?? ''),
    );
    const delivered = new Set([...css.matchAll(/--color-([\w-]+):/g)].map((m) => m[1] ?? ''));
    const builtIn = new Set([
      'sm',
      'xs',
      'base',
      'lg',
      'left',
      'right',
      'center',
      'collapse',
      't',
      'r',
      'b',
      'l',
      'x',
      'y',
      'balance',
      'transparent',
    ]);
    expect([...requested].filter((c) => !delivered.has(c) && !builtIn.has(c) && !/^\d|-$/.test(c))).toEqual(
      [],
    );
  });

  it('010/CA-1.3 T004: toda classe própria declarada no CSS tem elemento que a usa', () => {
    const own = [...css.matchAll(/^\.([a-z][\w-]*)\s*\{/gm)].map((m) => m[1] ?? '');
    expect(own.filter((c) => !tsx.includes(c))).toEqual([]);
  });

  it('010/CA-2.2 T006: todo peso de fonte usado existe nos arquivos da Figtree servidos', () => {
    const declared =
      /weight: \[([^\]]+)\]/.exec(readFileSync(join(__dirname, '../../app/layout.tsx'), 'utf8'))?.[1] ?? '';
    const map: Record<string, string> = {
      'font-normal': '400',
      'font-medium': '500',
      'font-semibold': '600',
      'font-bold': '700',
    };
    const used = new Set(
      [...tsx.matchAll(/\bfont-(normal|medium|semibold|bold|black|light|thin|extrabold)\b/g)].map(
        (m) => map[`font-${m[1]}`] ?? 'missing',
      ),
    );
    expect([...used].filter((w) => !declared.includes(`'${w}'`))).toEqual([]);
  });
});

describe('estilo servido é produto do build (010/US-1)', () => {
  it('010/CA-1.1 nenhum CSS compilado é versionado: só a fonte do Tailwind', () => {
    const versioned = execSync("git ls-files '*.css'", { cwd: join(__dirname, '../../../../..') })
      .toString()
      .trim()
      .split('\n');
    expect(versioned).toEqual(['apps/web/src/app/globals.css']);
    expect(css).toMatch(/^@import 'tailwindcss';/);
  });
});
