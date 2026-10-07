'use client';

import type { AppointmentOutput } from '@lubyvet/contracts';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FailureMessage } from '@/components/ui/failure-message';
import { type ApiError, apiSend, newIdempotencyKey } from '@/lib/api-client';

/**
 * 004/US-5 e D10: cancelar e marcar não comparecimento são finais, então pedem confirmação.
 * Cada ação manda a versão lida (US-5 da 001) e a própria Idempotency-Key.
 */
export function AppointmentActions({ path, version }: { path: string; version: number }) {
  const t = useTranslations('visits');
  const [failure, setFailure] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);
  const run = async (action: 'cancel' | 'no-show') => {
    setPending(true);
    const r = await apiSend<AppointmentOutput>('POST', `${path}/${action}`, { version }, newIdempotencyKey());
    setPending(false);
    if (r.ok) window.location.reload();
    else setFailure(r.error);
  };
  return (
    <>
      <ConfirmDialog
        trigger={t('noShow')}
        title={t('noShowTitle')}
        body={t('finalWarning')}
        confirm={t('noShow')}
        disabled={pending}
        onConfirm={() => void run('no-show')}
      />
      <ConfirmDialog
        trigger={t('cancel')}
        title={t('cancelTitle')}
        body={t('finalWarning')}
        confirm={t('cancel')}
        disabled={pending}
        onConfirm={() => void run('cancel')}
      />
      <div className="basis-full empty:hidden">
        <FailureMessage failure={failure} />
      </div>
    </>
  );
}
