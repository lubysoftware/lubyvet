import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Rastreabilidade: todo critério de aceite das specs (linha "- [ ] CA-x.y" ou "- [x] CA-x.y")
 * tem ao menos um teste cujo título cita "NNN/CA-x.y". Os testes ficam na suíte de aceitação da
 * API, nos componentes do web (Vitest) e no E2E do web (Playwright).
 */
const repo = join(__dirname, '../../../..');
const specsDir = join(repo, '.specify/specs');

const walk = (dir: string, match: RegExp): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    if (d.name === 'node_modules' || d.name.startsWith('.')) return [];
    const p = join(dir, d.name);
    return d.isDirectory() ? walk(p, match) : match.test(d.name) ? [p] : [];
  });

export function criteriaOf(spec: string): string[] {
  return [...spec.matchAll(/^\s*- \[[ x]\] (?:~~)?(CA-\d+\.\d+)/gm)].map((m) => m[1] ?? '');
}

/** Ids citados em títulos de teste: it('...'), it.each(...)('...'), test('...'). */
export function citedIn(source: string): Set<string> {
  const titles = [...source.matchAll(/\b(?:it|test)(?:\.each\([\s\S]*?\))?\(\s*(['"`])([\s\S]*?)\1/g)].map(
    (m) => m[2] ?? '',
  );
  return new Set(titles.flatMap((t) => [...t.matchAll(/(\d{3}\/CA-\d+\.\d+)/g)].map((m) => m[1] ?? '')));
}

const features = readdirSync(specsDir)
  .filter((d) => /^\d{3}-/.test(d))
  .sort();
const testFiles = [
  ...walk(join(repo, 'apps/api/test'), /\.(acceptance-spec|e2e-spec|int-spec|perf-spec)\.ts$/),
  ...walk(join(repo, 'apps/web/src'), /\.test\.tsx?$/),
  ...walk(join(repo, 'apps/web/e2e'), /\.e2e\.ts$/),
];
const cited = new Set(testFiles.flatMap((f) => [...citedIn(readFileSync(f, 'utf8'))]));

describe('rastreabilidade dos critérios de aceite', () => {
  it('as dez features do planejamento estão nas specs', () => {
    expect(features.map((f) => f.slice(0, 3))).toEqual([
      '001',
      '002',
      '003',
      '004',
      '005',
      '006',
      '007',
      '008',
      '009',
      '010',
    ]);
  });

  it('o leitor de critérios e de títulos reconhece os formatos usados', () => {
    expect(criteriaOf('- [ ] CA-1.1 a\n- [x] CA-2.3 b\n  - [ ] CA-4.5 c\nCA-9.9 solto')).toEqual([
      'CA-1.1',
      'CA-2.3',
      'CA-4.5',
    ]);
    expect([
      ...citedIn("it('001/CA-1.1 x', f); test(`006/CA-3.2 y`, g); it.each([1])('002/CA-2.2 %s', h)"),
    ]).toEqual(['001/CA-1.1', '006/CA-3.2', '002/CA-2.2']);
  });

  it.each(features)('%s: todo critério de aceite tem teste', (feature) => {
    const spec = readFileSync(join(specsDir, feature, 'spec.md'), 'utf8');
    const ids = criteriaOf(spec).map((ca) => `${feature.slice(0, 3)}/${ca}`);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.filter((id) => !cited.has(id))).toEqual([]);
  });

  it('nenhum teste cita critério que não existe', () => {
    const real = new Set(
      features.flatMap((f) =>
        criteriaOf(readFileSync(join(specsDir, f, 'spec.md'), 'utf8')).map((ca) => `${f.slice(0, 3)}/${ca}`),
      ),
    );
    expect([...cited].filter((id) => !real.has(id))).toEqual([]);
  });
});
