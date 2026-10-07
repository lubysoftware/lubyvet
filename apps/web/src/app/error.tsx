'use client';

import { useTranslations } from 'next-intl';
import { LinkButton } from '@/components/ui/button';
import { Preferences } from '@/features/shell/components/preferences';

/**
 * 008/CA-2.1 e CA-2.2: falha inesperada vira mensagem compreensível com o identificador da
 * ocorrência (o digest do Next, o mesmo do log do servidor), sem pilha nem detalhe interno.
 */
export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  const t = useTranslations('errorPage');
  return (
    <main id="conteudo" className="grid min-h-screen place-items-center px-4 py-8">
      <div
        role="alert"
        className="grid max-w-[480px] gap-4 rounded-lg border border-border bg-surface-raised p-6"
      >
        <h1 className="text-2xl font-semibold">{t('failureTitle')}</h1>
        <p>{t('failureBody', { occurrenceId: error.digest ?? '' })}</p>
        <div>
          <LinkButton href="/owners">{t('home')}</LinkButton>
        </div>
        <Preferences />
      </div>
    </main>
  );
}
