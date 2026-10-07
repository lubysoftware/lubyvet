import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { LinkButton } from '@/components/ui/button';
import { Preferences } from '@/features/shell/components/preferences';
import { THEME_COOKIE, resolveTheme } from '@/features/shell/theme';

/** 008/CA-1.1: "não encontrado" é página amigável, no idioma escolhido e com o seletor (P-04). */
export default async function NotFound() {
  const t = await getTranslations('errorPage');
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <main id="conteudo" className="grid min-h-screen place-items-center px-4 py-8">
      <div className="grid max-w-[480px] gap-4 rounded-lg border border-border bg-surface-raised p-6">
        <h1 className="text-2xl font-semibold">{t('notFoundTitle')}</h1>
        <p>{t('notFoundBody')}</p>
        <div>
          <LinkButton href="/owners">{t('home')}</LinkButton>
        </div>
        <Preferences theme={theme} />
      </div>
    </main>
  );
}
