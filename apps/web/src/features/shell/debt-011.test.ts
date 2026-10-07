import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buttonClass } from '@/components/ui/button';
import { ownerRecordUrl, ownersSearchUrl } from '@/lib/url-state';

const repo = join(__dirname, '../../../../..');
const src = join(__dirname, '../..');
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(p) && !/\.test\./.test(p) ? [p] : [];
  });

// 011/US-5: o front segue uma decisão registrada para formulário, componentes e URL.
describe('front alinhado ao padrão escrito (011/US-5)', () => {
  it('011/CA-5.1 formulários: a decisão está registrada e o padrão diz a mesma coisa', () => {
    expect(readFileSync(join(repo, 'memory/decisoes.md'), 'utf8')).toMatch(
      /\*\*D46\. Formulários pelo `useApiForm`/,
    );
    expect(readFileSync(join(repo, 'docs/padroes/frontend.md'), 'utf8')).toMatch(/decidida em D46/);
    const code = files(src)
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    expect(code).not.toMatch(/react-hook-form/);
  });

  it('011/CA-5.2 as peças vêm do shadcn/ui, ajustadas aos tokens', () => {
    const config = JSON.parse(readFileSync(join(src, '../components.json'), 'utf8')) as {
      aliases: { ui: string };
    };
    expect(config.aliases.ui).toBe('@/components/ui');
    expect(readdirSync(join(src, 'components/ui/base'))).toEqual(
      expect.arrayContaining(['button.tsx', 'dialog.tsx']),
    );
    expect(readFileSync(join(src, 'components/ui/button.tsx'), 'utf8')).toMatch(/from '\.\/base\/button'/);
    expect(readFileSync(join(src, 'components/ui/confirm-dialog.tsx'), 'utf8')).toMatch(
      /from '\.\/base\/dialog'/,
    );
    expect(buttonClass('primary')).toContain('bg-primary');
    expect(buttonClass('secondary')).toContain('h-11');
  });

  it('011/CA-5.3 o estado na URL passa só pelo nuqs; nenhuma tela monta query string à mão', () => {
    const handBuilt = files(src)
      .filter((f) => !f.endsWith('lib/url-state.ts'))
      .filter((f) => /[`'"][^`'"\n]*\?[a-zA-Z]+=|URLSearchParams\(/.test(readFileSync(f, 'utf8')));
    expect(handBuilt).toEqual([]);
    expect(ownersSearchUrl('/owners', { lastName: 'Silva', page: 2, pageSize: 5 })).toBe(
      '/owners?lastName=Silva&page=2&pageSize=5',
    );
    expect(ownerRecordUrl('/owners/7', { pet: 3, saved: 'petSaved' })).toBe('/owners/7?pet=3&saved=petSaved');
  });
});
