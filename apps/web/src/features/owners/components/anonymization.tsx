'use client';

import type { FreeTextItemOutput } from '@lubyvet/contracts';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FailureMessage } from '@/components/ui/failure-message';
import { type ApiError, apiSend, newIdempotencyKey } from '@/lib/api-client';

/**
 * 007/US-3, D24: o Administrador anonimiza o dono; o histórico clínico fica (P2). Não se desfaz,
 * então passa por confirmação. Sobrando texto livre com dado do dono, segue para a revisão (D25).
 */
export function AnonymizeOwner({ ownerId }: { ownerId: number }) {
  const t = useTranslations('anonymize');
  const [failure, setFailure] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);
  const run = async () => {
    setPending(true);
    const r = await apiSend<{ pendingReview: number }>(
      'POST',
      `/api/owners/${ownerId}/anonymize`,
      undefined,
      newIdempotencyKey(),
    );
    setPending(false);
    if (!r.ok) return setFailure(r.error);
    window.location.assign(r.body.pendingReview > 0 ? `/owners/${ownerId}/free-text` : `/owners/${ownerId}`);
  };
  return (
    <>
      <ConfirmDialog
        trigger={t('action')}
        title={t('title')}
        body={t('warning')}
        confirm={t('action')}
        disabled={pending}
        onConfirm={() => void run()}
      />
      <FailureMessage failure={failure} />
    </>
  );
}

/** D25: cada trecho com dado do dono aparece destacado; remover troca só aquele trecho. */
export function FreeTextReview({ ownerId, items }: { ownerId: number; items: FreeTextItemOutput[] }) {
  const t = useTranslations('anonymize');
  const tr = useTranslations();
  const [failure, setFailure] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);
  if (items.length === 0) return <p className="text-muted-foreground">{t('nothingLeft')}</p>;
  const redact = async (item: FreeTextItemOutput) => {
    const { text: _text, ...span } = item;
    setPending(true);
    const r = await apiSend(
      'POST',
      `/api/owners/${ownerId}/free-text/redact`,
      { spans: [span] },
      newIdempotencyKey(),
    );
    setPending(false);
    if (r.ok) window.location.reload();
    else setFailure(r.error);
  };
  return (
    <div className="grid gap-4">
      <FailureMessage failure={failure} />
      <ul className="grid gap-2">
        {items.map((i) => (
          <li
            key={`${i.entity}-${i.id}-${i.field}-${i.start}`}
            className="grid gap-2 rounded-md border border-border bg-surface-raised p-3"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tr(`freeTextEntity.${i.entity}`)}
            </span>
            <p>
              {i.text.slice(0, i.start)}
              <mark className="rounded-sm bg-status-pending-bg px-0.5 text-status-pending-fg">
                {i.text.slice(i.start, i.end)}
              </mark>
              {i.text.slice(i.end)}
            </p>
            <div>
              <Button variant="danger" disabled={pending} onClick={() => void redact(i)}>
                {t('redact')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
