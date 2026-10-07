'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

/** 001/US-7: tempo de vida da mensagem de resultado na tela (design system: Toast). */
export const RESULT_TTL_MS = 5000;
export type ResultCode = 'ownerSaved' | 'petSaved' | 'appointmentSaved' | 'encounterSaved' | 'saveFailed';

/**
 * 001/T014, 006/T006: a mensagem vem da resposta da própria operação (o código) e o texto do
 * catálogo. Sem mensagem, nenhum temporizador é agendado (UT-007-4).
 */
export function ResultMessage({ code }: { code: ResultCode | null }) {
  const t = useTranslations('result');
  const [visible, setVisible] = useState(code !== null);
  useEffect(() => {
    if (code === null) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), RESULT_TTL_MS);
    return () => clearTimeout(timer);
  }, [code]);
  if (!code || !visible) return null;
  return (
    <p
      role={code === 'saveFailed' ? 'alert' : 'status'}
      className="rounded-md border border-border bg-surface-raised px-4 py-3 font-semibold"
    >
      {t(code)}
    </p>
  );
}
