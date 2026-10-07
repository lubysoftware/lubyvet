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

/**
 * D25: cada trecho com dado do dono aparece destacado e marcado para remoção. O Administrador
 * desmarca o que não identifica a pessoa e conclui: a revisão é um envio só, que troca os trechos
 * confirmados por [removido] e encerra a pendência do dono.
 */
export function FreeTextReview({ ownerId, items }: { ownerId: number; items: FreeTextItemOutput[] }) {
  const t = useTranslations('anonymize');
  const tr = useTranslations();
  const [failure, setFailure] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);
  const [keep, setKeep] = useState<Set<number>>(new Set());
  if (items.length === 0) return <p className="text-muted-foreground">{t('nothingLeft')}</p>;
  const conclude = async () => {
    const spans = items.filter((_, n) => !keep.has(n)).map(({ text: _text, ...span }) => span);
    setPending(true);
    const r = await apiSend(
      'POST',
      `/api/owners/${ownerId}/free-text/redact`,
      { spans },
      newIdempotencyKey(),
    );
    setPending(false);
    if (r.ok) window.location.assign(`/owners/${ownerId}`);
    else setFailure(r.error);
  };
  const toggle = (n: number) =>
    setKeep((k) => {
      const next = new Set(k);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  return (
    <div className="grid gap-4">
      <FailureMessage failure={failure} />
      <ul className="grid gap-2">
        {items.map((i, n) => (
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
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={!keep.has(n)}
                onChange={() => toggle(n)}
                className="size-5 accent-primary"
              />
              {t('removeExcerpt', { excerpt: i.text.slice(i.start, i.end) })}
            </label>
          </li>
        ))}
      </ul>
      <div>
        <Button variant="danger" disabled={pending} onClick={() => void conclude()}>
          {t('conclude')}
        </Button>
      </div>
    </div>
  );
}
