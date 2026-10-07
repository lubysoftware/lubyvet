'use client';

import { useTranslations } from 'next-intl';
import type { ApiError } from '@/lib/api-client';

/** Recusa da API dita pelo código (D31): o texto vem do catálogo, nunca do servidor. */
export function FailureMessage({ failure }: { failure: ApiError | null }) {
  const t = useTranslations('errors');
  if (!failure || failure.code === 'validation_failed') return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive bg-surface-raised px-4 py-3 font-semibold text-destructive"
    >
      {t(failure.code, { occurrenceId: failure.occurrenceId ?? '' })}
    </p>
  );
}
