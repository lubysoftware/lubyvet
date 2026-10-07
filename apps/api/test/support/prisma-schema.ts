import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface MappedField {
  field: string;
  column: string | null;
  /** Tamanho declarado em @db.VarChar(n)/@db.Char(n), quando houver. */
  length: number | null;
}
export interface MappedModel {
  model: string;
  table: string | null;
  fields: MappedField[];
}

const SCALARS = new Set([
  'String',
  'Int',
  'BigInt',
  'Float',
  'Decimal',
  'Boolean',
  'DateTime',
  'Json',
  'Bytes',
]);

/** Lê os modelos do schema.prisma com o nome de tabela e de coluna que cada um declara (P3). */
export function readPrismaModels(): MappedModel[] {
  const text = readFileSync(join(__dirname, '../../prisma/schema.prisma'), 'utf8');
  const models: MappedModel[] = [];
  for (const m of text.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    const [, model = '', body = ''] = m;
    const table = /@@map\("([^"]+)"\)/.exec(body)?.[1] ?? null;
    const fields: MappedField[] = [];
    for (const line of body.split('\n')) {
      const f = /^\s+(\w+)\s+(\w+)(\[\])?\??\s*(.*)$/.exec(line);
      if (!f || line.trim().startsWith('//') || line.trim().startsWith('@@')) continue;
      const [, field = '', type = '', isList, rest = ''] = f;
      if (!SCALARS.has(type) || isList) continue;
      const column = /@map\("([^"]+)"\)/.exec(rest)?.[1] ?? null;
      const len = /@db\.(?:VarChar|Char)\((\d+)\)/.exec(rest)?.[1];
      fields.push({ field, column, length: len ? Number(len) : null });
    }
    models.push({ model, table, fields });
  }
  return models;
}
