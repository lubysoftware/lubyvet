import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, normalize } from 'node:path';

/**
 * 011/T001: o único caminho por onde um teste de aceitação lê arquivo do repositório. Critério de
 * comportamento se prova pela API ou pela tela; ler arquivo só vale para o que é estrutural por
 * natureza, e cada entrada abaixo diz por quê. Ler fora desta lista é erro.
 */
export const REPO = normalize(join(__dirname, '../../../..'));

export const STRUCTURAL: readonly { pattern: RegExp; why: string }[] = [
  { pattern: /^\.specify\/specs\//, why: 'rastreabilidade: os critérios de aceite e as tarefas das specs' },
  {
    pattern: /^apps\/(api\/test|web\/e2e)(\/|$)|^apps\/web\/src\/.+\.test\.tsx?$/,
    why: 'rastreabilidade: os títulos dos testes',
  },
  { pattern: /^apps\/web\/src\/i18n\/messages\/[\w-]+\.json$/, why: 'catálogo de tradução (P7)' },
  { pattern: /^deploy\/(helm|grafana)\//, why: 'manifesto de publicação e painel versionado' },
  { pattern: /^apps\/(api|web)\/package\.json$/, why: 'dependências do que se publica' },
  { pattern: /^apps\/api\/prisma(\/|$)/, why: 'esquema e migrações versionadas (P5)' },
];

export function allowed(rel: string): boolean {
  return STRUCTURAL.some((s) => s.pattern.test(rel));
}

function check(rel: string): string {
  const clean = normalize(rel).replace(/\/$/, '');
  if (!allowed(clean))
    throw new Error(`${clean} não é leitura estrutural permitida (test/support/structural.ts)`);
  return join(REPO, clean);
}

/** Conteúdo de um arquivo do repositório, pelo caminho relativo à raiz. */
export const readRepo = (rel: string): string => readFileSync(check(rel), 'utf8');

/**
 * Nomes dos arquivos de uma pasta (relativos à raiz); `deep` desce nas subpastas, sem
 * node_modules. Listar nomes não lê conteúdo, então não passa pela lista; ler, sim.
 */
export function listRepo(rel: string, deep = false): string[] {
  const base = join(REPO, normalize(rel));
  const out: string[] = [];
  for (const name of readdirSync(base)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const child = `${normalize(rel).replace(/\/$/, '')}/${name}`;
    if (deep && statSync(join(REPO, child)).isDirectory()) out.push(...listRepo(child, true));
    else out.push(child);
  }
  return out;
}
