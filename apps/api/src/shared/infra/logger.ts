import pino from 'pino';

/**
 * 008/T002, T006, T011, P-16: log estruturado (pino) em JSON na saída padrão, coletado pelo
 * OpenTelemetry Collector. Nunca leva dado pessoal nem credencial: estes caminhos são removidos.
 */
export const REDACTED_PATHS = [
  '*.firstName',
  '*.lastName',
  '*.address',
  '*.city',
  '*.telephone',
  '*.cpf',
  '*.email',
  '*.name',
  '*.password',
  '*.passwordHash',
  '*.description',
  '*.chiefComplaint',
  '*.diagnosis',
  '*.conduct',
  'req.headers.cookie',
  'req.headers.authorization',
  '*.DATABASE_URL',
  '*.REDIS_URL',
  '*.RABBITMQ_URL',
];

/** T011: credencial embutida em URL vira ***. */
export function maskSecrets(text: string): string {
  return text.replace(/(\w+:\/\/[^:/\s]+:)[^@/\s]+@/g, '$1***@');
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
  formatters: { log: (obj) => JSON.parse(maskSecrets(JSON.stringify(obj))) as Record<string, unknown> },
});
