#!/usr/bin/env node
// Marca tarefas como concluídas no tasks.md da feature: node scripts/task-done.mjs 001 T003 T005
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const [feature, ...ids] = process.argv.slice(2);
const dir = readdirSync('.specify/specs').find((d) => d.startsWith(`${feature}-`));
if (!dir || ids.length === 0) throw new Error('uso: node scripts/task-done.mjs <feature> <T001> [T002...]');
const file = `.specify/specs/${dir}/tasks.md`;
let text = readFileSync(file, 'utf8');
for (const id of ids) {
  const before = text;
  text = text.replace(new RegExp(`^- \\[ \\] \\*\\*${id}\\*\\*`, 'm'), `- [x] **${id}**`);
  if (text === before) throw new Error(`${id} não encontrada ou já marcada em ${file}`);
}
writeFileSync(file, text);
console.log(`${file}: ${ids.join(', ')} concluídas`);
