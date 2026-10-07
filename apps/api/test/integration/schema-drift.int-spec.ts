import { execSync } from 'node:child_process';

// P5: o esquema muda só por migração; schema.prisma e migrações aplicadas não podem divergir.
describe('migrações versionadas', () => {
  it('o banco migrado coincide com o schema.prisma, sem diferença', () => {
    const out = execSync(
      'npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script',
      {
        cwd: `${__dirname}/../..`,
        env: process.env,
      },
    ).toString();
    expect(out.replace(/--.*$/gm, '').trim()).toBe('');
  });
});
