import { STRUCTURAL, allowed, listRepo, readRepo } from '../support/structural';

/**
 * Rastreabilidade: todo critério de aceite das specs (linha "- [ ] CA-x.y" ou "- [x] CA-x.y")
 * tem ao menos um teste cujo título cita "NNN/CA-x.y". Os testes ficam na suíte de aceitação da
 * API, nos componentes do web (Vitest) e no E2E do web (Playwright). A exigência vale para a
 * feature entregue, a que tem todas as tarefas marcadas no tasks.md; a planejada fica listada.
 */
const SPECS = '.specify/specs';
const walk = (dir: string, match: RegExp): string[] => listRepo(dir, true).filter((f) => match.test(f));
const spec = (feature: string, file: 'spec.md' | 'tasks.md') => readRepo(`${SPECS}/${feature}/${file}`);

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

const features = listRepo(SPECS)
  .map((d) => d.slice(SPECS.length + 1))
  .filter((d) => /^\d{3}-/.test(d))
  .sort();
/** Entregue: tem tarefas e nenhuma ainda em aberto ("- [ ] **T"). */
export const delivered = (tasks: string): boolean =>
  /- \[x\] \*\*T/.test(tasks) && !/- \[ \] \*\*T/.test(tasks);
const done = features.filter((f) => delivered(spec(f, 'tasks.md')));
const testFiles = [
  ...walk('apps/api/test', /\.(acceptance-spec|e2e-spec|int-spec|perf-spec)\.ts$/),
  ...walk('apps/web/src', /\.test\.tsx?$/),
  ...walk('apps/web/e2e', /\.e2e\.ts$/),
];
const cited = new Set(testFiles.flatMap((f) => [...citedIn(readRepo(f))]));

describe('rastreabilidade dos critérios de aceite', () => {
  it('as dez features da primeira entrega estão entregues (todas as tarefas marcadas)', () => {
    expect(done.map((f) => f.slice(0, 3))).toEqual([
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

  it('o leitor de tarefas distingue entregue de planejada', () => {
    expect(delivered('- [x] **T001** a\n- [x] **T002** b')).toBe(true);
    expect(delivered('- [x] **T001** a\n- [ ] **T002** b')).toBe(false);
    expect(delivered('sem tarefa')).toBe(false);
  });

  it.each(done)('%s: todo critério de aceite tem teste', (feature) => {
    const ids = criteriaOf(spec(feature, 'spec.md')).map((ca) => `${feature.slice(0, 3)}/${ca}`);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.filter((id) => !cited.has(id))).toEqual([]);
  });

  it('nenhum teste cita critério que não existe', () => {
    const real = new Set(
      features.flatMap((f) => criteriaOf(spec(f, 'spec.md')).map((ca) => `${f.slice(0, 3)}/${ca}`)),
    );
    expect([...cited].filter((id) => !real.has(id))).toEqual([]);
  });

  it('011/CA-4.2 a lista do que um teste pode ler fica num lugar só, cada entrada com o motivo', () => {
    expect(STRUCTURAL.every((e) => e.why.length > 10)).toBe(true);
    for (const ok of [
      'deploy/helm/lubyvet/values.yaml',
      'apps/web/src/i18n/messages/en.json',
      'apps/api/prisma/schema.prisma',
    ])
      expect([ok, allowed(ok)]).toEqual([ok, true]);
    for (const no of [
      'apps/web/src/features/owners/components/owners-search-view.tsx',
      'apps/api/src/modules/owners/infra/prisma-owner.repository.ts',
      'packages/contracts/src/owners/owner.schema.ts',
    ]) {
      expect([no, allowed(no)]).toEqual([no, false]);
      expect(() => readRepo(no)).toThrow(/não é leitura estrutural permitida/);
    }
  });

  it('011/CA-4.1 nenhum teste de aceitação lê arquivo por fora da lista estrutural', () => {
    // Este arquivo fica de fora só porque a expressão abaixo contém o próprio texto que procura.
    const suites = walk('apps/api/test/acceptance', /\.acceptance-spec\.ts$/).filter(
      (f) => !f.endsWith('traceability.acceptance-spec.ts'),
    );
    expect(suites.length).toBeGreaterThanOrEqual(8);
    const direct = suites.filter((f) =>
      /from 'node:fs'|require\('(node:)?fs'\)|child_process/.test(readRepo(f)),
    );
    expect(direct).toEqual([]);
  });

  it('011/CA-4.3 a rastreabilidade continua exigindo teste para cada critério das features entregues', () => {
    expect(done.length).toBeGreaterThanOrEqual(10);
    for (const f of done) expect(criteriaOf(spec(f, 'spec.md')).length).toBeGreaterThan(0);
  });
});
