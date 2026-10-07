#!/usr/bin/env node
// 008/T020, P-13: falha se encontrar valor de credencial versionado (só nomes podem existir).
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ALLOWED = new Set(['docker-compose.yml', '.env.example']);
const PATTERNS = [
  /postgres(?:ql)?:\/\/[^:\s]+:[^@\s${]+@(?!localhost)/i,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /EAA[A-Za-z0-9]{40,}/,
];
const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && !ALLOWED.has(f) && !/\.(png|jpg|lock|woff2?)$/.test(f) && !f.endsWith('bun.lock'));
const hits = files.filter((f) => {
  try {
    const text = readFileSync(f, 'utf8');
    return PATTERNS.some((p) => p.test(text));
  } catch {
    return false;
  }
});
if (hits.length) {
  console.error(`credencial versionada em: ${hits.join(', ')}`);
  process.exit(1);
}
console.log(`nenhuma credencial versionada (${files.length} arquivos)`);
