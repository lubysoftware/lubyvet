/**
 * P6: a violação de unicidade é reconhecida pelo TIPO do erro e pelo NOME da restrição,
 * nunca pelo texto da mensagem. Devolve o nome da restrição violada, ou null.
 */
export function violatedUniqueConstraint(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || (error as { code?: unknown }).code !== 'P2002')
    return null;
  const meta = (error as { meta?: Record<string, unknown> }).meta ?? {};
  const cause = (
    meta.driverAdapterError as { cause?: { constraint?: { index?: string; fields?: string[] } } } | undefined
  )?.cause;
  if (cause?.constraint?.index) return cause.constraint.index;
  const target = meta.target;
  return typeof target === 'string' ? target : null;
}
